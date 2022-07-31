const express = require("express");
const { check } = require("express-validator");
const fileUpload = require("../middlewares/file-upload");
const placesControllers = require("../controllers/places-controllers");
const checkAuth = require("../middlewares/check-auth");

const router = express.Router();

//Register middlewares
router.get("/:pid", placesControllers.getPlaceById);

router.get("/user/:uid", placesControllers.getPlacesByUserId);

router.use(checkAuth);

router.post(
  "/",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesControllers.createNewPlace
);

router.patch(
  "/:pid",
  fileUpload.single("image"),
  [
    check("title").not().isEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").not().isEmpty(),
  ],
  placesControllers.updatePlaceById
);

router.delete("/:pid", placesControllers.deletePlaceById);

module.exports = router;
