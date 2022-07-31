const fs = require("fs");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const HttpError = require("../models/http-error");

const getAllUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (error) {
    return next(new HttpError("Something went wrong, please try again", 500));
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signUp = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Inputs invalid, please try again", 422));
  }
  const { name, email, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    const error = new HttpError("Something went wrong, please try again", 500);
    return next(error);
  }

  if (existingUser) {
    return next(
      new HttpError(
        "Email already registed, please use another email or login",
        422
      )
    );
  }

  let hashPassword;
  try {
    hashPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    return next(
      new HttpError("Could not create account, please try again!!!", 500)
    );
  }

  const newUser = new User({
    name,
    email,
    password: hashPassword,
    places: [],
  });
  try {
    await newUser.save();
  } catch (err) {
    return next(err);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(
      new HttpError("Could not create account, please try again!!!", 500)
    );
  }

  res.status(201).json({ userId: newUser.id, email: newUser.email, token });
};

const logIn = async (req, res, next) => {
  const { email, password } = req.body;

  let identifiedUser;

  try {
    identifiedUser = await User.findOne({ email });
  } catch (err) {
    const error = new HttpError("Something went wrong, please try again", 500);
    return next(error);
  }

  if (!identifiedUser) {
    return next(new HttpError("This email does not sign up yet!", 401));
  }

  let checkPassword;
  try {
    checkPassword = await bcrypt.compare(password, identifiedUser.password);
  } catch (error) {
    return next(
      new HttpError(
        "Could not sign you in (password error), please try again!!!",
        500
      )
    );
  }

  if (!checkPassword) {
    return next(new HttpError("Password not correct, try again!", 401));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: identifiedUser.id, email: identifiedUser.email },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );
  } catch (error) {
    return next(
      new HttpError(
        "Could not sign you in (create token error), please try again!!!",
        500
      )
    );
  }

  res.json({
    userId: identifiedUser.id,
    email: identifiedUser.email,
    token,
  });
};

const getCurrentUser = async (req, res, next) => {
  const userId = req.params.uid;
  let user;
  try {
    user = await User.findById(userId);
  } catch (error) {
    return next(new HttpError("Something went wrong, please try again", 500));
  }
  res.json({ user: user.toObject({ getters: true }) });
};

const updateUserProfile = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    return next(new HttpError("Inputs invalid, please try again", 422));
  }
  const { name } = req.body;
  const userId = req.params.uid;

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, Could not find user",
      500
    );
    return next(error);
  }

  user.name = name;
  if (req.file) {
    fs.unlink(user.image, (err) => console.log(err));
    user.image = req.file.path;
  }

  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, Could not update user",
      500
    );
    return next(error);
  }

  res.status(200).json({ user: user.toObject({ getters: true }) });
};

exports.getAllUsers = getAllUsers;
exports.signUp = signUp;
exports.logIn = logIn;
exports.getCurrentUser = getCurrentUser;
exports.updateUserProfile = updateUserProfile;
