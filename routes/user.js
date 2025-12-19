// routes/user.js
import express from "express";
import User from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authHeader.js";

const router = express.Router();

dotenv.config();


// User Register
router.post("/register", async (req, res) => {
  try {
    const { firstname, lastname, email, password, photoURL, about, skills , age, gender} =
      req.body;

    // Check missing fields
    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Firstname, lastname, email and password are required",
      });
    }

    // Check user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      photoURL: photoURL || "",
      about: about || "",
      skills: Array.isArray(skills) ? skills : [],
      age: age || "",
      gender: gender || "" ,
    });

    const savedUser = await newUser.save();

    console.log("User registered:", savedUser);

    // 3. Generate JWT token
    const token = jwt.sign(
      { id: savedUser._id, email: savedUser.email },
      "DEV_SECRET_KEY",
      { expiresIn: "7d" }
    );

    // 4. Set token in cookies
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // true only in production
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: savedUser._id,
        firstname: savedUser.firstname,
        lastname: savedUser.lastname,
        email: savedUser.email,
        photoURL: savedUser.photoURL,
        about: savedUser.about,
        skills: savedUser.skills,
        age: savedUser.age,
        gender: savedUser.gender
      },
    });

  } catch (error) {
    console.log("Error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "User registration failed" });
  }
});

//User Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all the fields!" });
    }

    // 1. Check if user exists
    const user = await User.findOne({ email: email });

    if (!user) {
      return res.status(400).json({ message:"No account found with this email. Please create an account." });
    }

    // 2. Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid Credentials!" });
    }

    // 3. Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      "DEV_SECRET_KEY",
      { expiresIn: "7d" }
    );

    // 4. Set token in cookies
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // true only in production
    });

    // 5. Send cleaned user data
    res.status(200).json({
      success: true,
      message: "Login Successful!",
      token,
      user: {
        id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        photoURL: user.photoURL,
        about: user.about,
        skills: user.skills,
      },
    });
  } catch (error) {
    console.log("Login Error:", error.message);
    res.status(500).json({ message: "Server error during login" });
  }
});

// Update User Profile
router.patch("/update-profile", authenticateToken, async (req, res) => {
  try {
    const { firstname, lastname, age, gender, photoURL, about } = req.body;

    // Build dynamic update object
    const updateData = {};

    if (firstname) updateData.firstname = firstname;
    if (lastname) updateData.lastname = lastname;
    if (age) updateData.age = age;
    if (gender) updateData.gender = gender;
    if (photoURL) updateData.photoURL = photoURL;
    if (about) updateData.about = about;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true } // return updated document
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: updatedUser._id,
        firstname: updatedUser.firstname,
        lastname: updatedUser.lastname,
        age: updatedUser.age,
        gender: updatedUser.gender,
        photoURL: updatedUser.photoURL,
        about: updatedUser.about,
        email: updatedUser.email,
        skills: updatedUser.skills,
      },
    });
  } catch (error) {
    console.log("Update Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile",
    });
  }
});


// USER LOGOUT
router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // keep false in local, true in production
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.log("Logout Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
});

router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    //console.log(user);
    
    res.status(200).json(user);

  } catch (error) {
    console.log("Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /feed – show all other users except the current user
router.get("/feed", authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // fetch all users except the logged-in one
    const users = await User.find({ _id: { $ne: currentUserId } })
      .select("-password")
      .lean();

    if (!users || users.length === 0) {
      return res.status(404).json({ message: "No users available in feed." });
    }

    res.status(200).json({
      message: "Feed fetched successfully.",
      users,
    });

  } catch (error) {
    console.log("Feed Error:", error);
    res.status(500).json({ message: "Server error fetching feed." });
  }
});

router.get("/request/received", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("connectionRequests", "firstname lastname photoURL about skills");

    return res.status(200).json({
      success: true,
      receivedRequests: user.connectionRequests,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch received requests",
    });
  }
});

router.get("/connections", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("connections", "firstname lastname photoURL age gender about skills");

    return res.status(200).json({
      success: true,
      connections: user.connections,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch connections",
    }); 
  }
});

// Accept Connection Request
router.patch("/review/request/accepted/:requestUserId", authenticateToken, async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    const requestUserId = req.params.requestUserId;

    const loggedInUser = await User.findById(loggedInUserId);
    const requestUser = await User.findById(requestUserId);

    if (!loggedInUser.connectionRequests.includes(requestUserId)) {
      return res.status(400).json({ success: false, message: "No such connection request found" });
    }

    // Remove from connectionRequests
    loggedInUser.connectionRequests = loggedInUser.connectionRequests.filter(
      (id) => id.toString() !== requestUserId
    );

    // Add to connections if not already there
    if (!loggedInUser.connections.includes(requestUserId)) {
      loggedInUser.connections.push(requestUserId);
    }

    // Also add loggedInUser to the requestUser's connections
    if (!requestUser.connections.includes(loggedInUserId)) {
      requestUser.connections.push(loggedInUserId);
    }

    await loggedInUser.save();
    await requestUser.save();

    return res.json({ success: true, message: "Connection accepted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Reject Connection Request
router.patch("/review/request/rejected/:requestUserId", authenticateToken, async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    const requestUserId = req.params.requestUserId;

    const loggedInUser = await User.findById(loggedInUserId);

    // Remove from connectionRequests
    loggedInUser.connectionRequests = loggedInUser.connectionRequests.filter(
      (id) => id.toString() !== requestUserId
    );

    await loggedInUser.save();

    return res.json({ success: true, message: "Connection rejected" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

//Send Request (Interested)
router.patch("/request/sent/interested/:targetId", authenticateToken, async (req, res) => {
  try {
    const loggedInUserId = req.user.id;   // FIXED
    const targetId = req.params.targetId;

    if (loggedInUserId === targetId) {
      return res.status(400).json({ message: "Cannot send request to yourself." });
    }

    // Add to logged-in user's sentRequests
    const userUpdate = User.findByIdAndUpdate(
      loggedInUserId,
      { $addToSet: { sentRequests: targetId } },
      { new: true }
    );

    // Add to target user’s connectionRequests
    const targetUpdate = User.findByIdAndUpdate(
      targetId,
      { $addToSet: { connectionRequests: loggedInUserId } },
      { new: true }
    );

    await Promise.all([userUpdate, targetUpdate]);

    res.json({ message: "Interest sent successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


//Ignore / Withdraw Request
router.patch("/request/sent/rejected/:targetId", authenticateToken,async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const targetId = req.params.targetId;

    // Remove from logged-in user's sentRequests
    const userUpdate = User.findByIdAndUpdate(
      loggedInUserId,
      { $pull: { sentRequests: targetId } },
      { new: true }
    );

    // Remove from target user's connectionRequests
    const targetUpdate = User.findByIdAndUpdate(
      targetId,
      { $pull: { connectionRequests: loggedInUserId } },
      { new: true }
    );

    await Promise.all([userUpdate, targetUpdate]);

    res.json({ message: "Request ignored / withdrawn successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


export default router;