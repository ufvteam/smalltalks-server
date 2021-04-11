const path = require('path');
const asyncHandler = require('../middleware/async');
const ThrowError = require('../utils/throwError');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

/**
 * @description     Upload user profile picture
 * @route           PUT /api/v1/auth/:userId/profilepic
 * @access          Private
 */
exports.uploadProfilePic = asyncHandler(async (req, res, next) => {
  const user = await User.findOne('userId', req.params.userId);

  // Check if the user is found
  if (!user) return next(new ThrowError('User not found!', 404));

  // Check if the user owner
  if (user.userId !== req.user.userId && req.user.role !== 'admin')
    return next(
      new ThrowError(
        'This user is not authorized to update the picture profile',
        401
      )
    );

  if (!req.files) return next(new ThrowError('Please upload a picture', 400));

  const file = req.files.file;

  //   Make sure the image is a photo
  if (!file.mimetype.startsWith('image')) {
    return next(new ThrowError('Please upload an image file', 400));
  }

  // Check filesize
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ThrowError(
        `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
        404
      )
    );
  }

  // Create custom filename and its extension
  file.name = `photo_${user.userId}${path.parse(file.name).ext}`;

  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.log(err);
      return next(new ThrowError(`Problem with file upload`, 500));
    }
    await User.findUserAndUpdatePicture(req.params.userId, file.name);

    res.status(200).json({
      success: true,
      data: file.name,
    });
  });
});

/**
 * @description     Register user
 * @route           POST /api/v1/auth/register
 * @access          Public
 */
exports.register = asyncHandler(async (req, res, next) => {
  // Create user
  const user = await User.create(req.body);

  sendTokenCookie(user.insertId, 200, res);
});

/**
 * @description     Login user
 * @route           POST /api/v1/auth/login
 * @access          Public
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne('email', email);

  if (!user) return next(new ThrowError('Invalid credentials', 401));

  // Check if password matches
  const isMatched = await User.matchPassword(password, user.password);

  if (!isMatched) return next(new ThrowError('Invalid credentials', 401));

  sendTokenCookie(user.userId, 200, res);
});

/**
 * @description     Get current logged in user
 * @route           GET /api/v1/auth/login
 * @access          Private
 */
exports.getMe = asyncHandler(
  asyncHandler(async (req, res, next) => {
    const user = await User.findOne('userId', req.user.userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  })
);

/**
 * @description     Forgot password
 * @route           GET /api/v1/auth/forgotpassword
 * @access          Public
 */
exports.forgotPassword = asyncHandler(
  asyncHandler(async (req, res, next) => {
    const user = await User.findOne('email', req.body.email);

    if (!user) return next(new ThrowError('There is user with req.body.email'));

    // Get reset token
    const resetToken = await User.getResetPasswordToken(user.userId);

    // Create reset url
    const resetUrl = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/resetpassword/${resetToken}`;

    const message = `You are receiving this email because you has requested a password. Click on the link below to change your password:\n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Reset Password',
        message,
      });

      res.status(200).json({ success: true, data: 'Email Sent!' });
    } catch (error) {
      console.log(error);

      return next(new ThrowError('Email could not be sent', 500));
    }
  })
);

const sendTokenCookie = (userId, statusCode, res) => {
  // Create token
  const token = User.getSignedJwtToken(userId);

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({ success: true, token });
};
