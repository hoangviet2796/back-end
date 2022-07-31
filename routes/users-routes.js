const express = require("express");
const { check } = require("express-validator");

const fileUpload = require("../middlewares/file-upload");
const usersControllers = require("../controllers/users-controllers");

const router = express.Router();

//Register middlewares
router.get("/", usersControllers.getAllUsers);
router.post(
  "/signup",
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  usersControllers.signUp
);
router.post("/login", usersControllers.logIn);
router.get("/:uid", usersControllers.getCurrentUser);
router.patch(
  "/:uid",
  fileUpload.single("image"),
  [check("name").not().isEmpty()],
  usersControllers.updateUserProfile
);

module.exports = router;
