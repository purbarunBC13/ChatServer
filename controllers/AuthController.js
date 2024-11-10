import { compare } from "bcrypt";
import User from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const maxAge = 3 * 24 * 60 * 60 * 1000;
const createToken = (email, userId) => {
  return jwt.sign({ email, userId }, process.env.JWT_KEY, {
    expiresIn: maxAge,
  });
};

export const signup = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send("Please enter email and password");
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).send("User already exists");
    }

    const user = await User.create({ email, password });
    res.cookie("jwt", createToken(email, user.id), {
      maxAge,
      httpOnly: false,
      secure: false,
      sameSite: "lax",
    });
    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        profileSetup: user.profileSetup,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error");
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).send("Please enter email and password");
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send("User not found");
    }
    const auth = await compare(password, user.password);
    if (!auth) {
      return res.status(400).send("Invalid credentials");
    }
    res.cookie("jwt", createToken(email, user.id), {
      maxAge,
      httpOnly: false,
      secure: false,
      sameSite: "lax",
    });
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        profileSetup: user.profileSetup,
        firstName: user.firstName,
        lastName: user.lastName,
        image: user.image,
        color: user.color,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error");
  }
};

export const getUserInfo = async (req, res, next) => {
  try {
    // console.log(req.userId);
    const userData = await User.findById(req.userId);
    if (!userData) {
      return res.status(400).send("User not found");
    }
    return res.status(200).json({
      id: userData.id,
      email: userData.email,
      profileSetup: userData.profileSetup,
      firstName: userData.firstName,
      lastName: userData.lastName,
      image: userData.image,
      color: userData.color,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error");
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { userId } = req;
    const { firstName, lastName, color, image } = req.body;

    // Validate required fields
    if (!firstName || !lastName || color === undefined) {
      return res
        .status(400)
        .send("First name, last name, and color are required");
    }

    // Prepare update data, including optional image info
    const updateData = {
      firstName,
      lastName,
      color,
      profileSetup: true,
    };

    if (image) {
      updateData.image = {
        url: image.url,
        public_id: image.public_id,
      };
    }

    const userData = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!userData) {
      return res.status(400).send("User not found");
    }

    return res.status(200).json({
      id: userData.id,
      email: userData.email,
      profileSetup: userData.profileSetup,
      firstName: userData.firstName,
      lastName: userData.lastName,
      image: userData.image,
      color: userData.color,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error");
  }
};

// export const addProfileImage = async (req, res, next) => {
//   try {
//     if (!req.file) {
//       return res.status(400).send("Please upload a file");
//     }
//     const date = Date.now();
//     let filename = "uploads/profiles/" + date + req.file.originalname;
//     renameSync(req.file.path, filename);

//     const updatedUser = await User.findByIdAndUpdate(
//       req.userId,
//       { image: filename },
//       { new: true, runValidators: true }
//     );
//     return res.status(200).json({
//       image: updatedUser.image,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).send("Internal server error");
//   }
// };

export const removeProfileImage = async (req, res, next) => {
  try {
    const { userId } = req;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Check if the user has an image with a public_id
    if (user.image && user.image.public_id) {
      // Delete the image from Cloudinary
      const result = await cloudinary.uploader.destroy(user.image.public_id);

      if (result.result !== "ok") {
        return res.status(500).send("Failed to delete image from Cloudinary");
      }
    }

    // Set user's image field to null and save
    user.image = null;
    await user.save();

    return res.status(200).send("Profile image removed successfully");
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error");
  }
};

export const logout = async (req, res, next) => {
  try {
    res.cookie("jwt", "", {
      maxAge: 1,
      httpOnly: false,
      secure: false,
      sameSite: "lax",
    });
    return res.status(200).send("Loggedout successfully");
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal server error");
  }
};
