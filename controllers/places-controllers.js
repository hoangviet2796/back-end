const { validationResult } = require("express-validator");

const fs = require("fs");
const HttpError = require("../models/http-error");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError("Could not find a place", 500);
    return next(error);
  }
  if (!place) {
    return next(new HttpError("Could not find your place", 404));
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;
  try {
    places = Place.find({ creator: userId });
  } catch (err) {
    const error = new HttpError("Could not find a place by specific ID.", 500);
    return next(error);
  }

  if (places.length === 0) {
    throw new HttpError("Could not find your place", 404);
  }
  console.log();
  res.json({
    places: (await places).map((place) => place.toObject({ getters: true })),
  });
};

const createNewPlace = async (req, res, next) => {
  const error = validationResult(req);
  console.log(error);
  if (!error.isEmpty()) {
    return next(new HttpError("Inputs invalid, please try again", 422));
  }
  const { title, description, address, lat, lng } = req.body;

  let imageUrl;
  if (req.file) {
    imageUrl = req.file.path;
  }

  const newPlace = new Place({
    title,
    description,
    imageUrl,
    address,
    location: { lat, lng },
    creator: req.userData.userId,
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError("Could not find a user", 500);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await newPlace.save({ session: sess });
    user.places.push(newPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    return next(err);
  }

  res.status(201).json({ place: newPlace.toObject({ getters: true }) });
};

const updatePlaceById = async (req, res, next) => {
  const error = validationResult(req);

  if (!error.isEmpty()) {
    throw new HttpError("Inputs invalid, please try again", 422);
  }
  const { title, description, address } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, Could not find a place",
      500
    );
    return next(error);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const error = new HttpError("You're not allow to do this", 401);
    return next(error);
  }

  place.title = title;
  place.description = description;
  place.address = address;
  if (req.file) {
    fs.unlink(place.imageUrl, (err) => {
      console.log(err);
    });
    place.imageUrl = req.file.path;
  }

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, Could not update place",
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};
const deletePlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, Could not delete a place",
      500
    );
    return next(error);
  }

  if (place.creator.id !== req.userData.userId) {
    const error = new HttpError("You're not allow to do this", 401);
    return next(error);
  }

  try {
    const sess = await mongoose.startSession();
    console.log("start session");
    sess.startTransaction();
    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {}

  fs.unlink(place.imageUrl, (err) => {
    console.log(err);
  });
  res.status(200).json("Delete success");
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createNewPlace = createNewPlace;
exports.updatePlaceById = updatePlaceById;
exports.deletePlaceById = deletePlaceById;
