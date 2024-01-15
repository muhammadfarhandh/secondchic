const User = require('../schemas/User')
const crypto = require('crypto');
const asyncHandler = require('../middleware/async');
const nodemailer = require('../utils/nodemailer');
const ErrorResponse = require('../utils/errorResponse');

//--//
/**
 * @description creates a new user
 * @param {object} req - request object
 * @param {object} res - response object
 * @param {function} next - next middleware function
 * @returns {object} JSON response
 */
exports.signup = async (req, res, next) => {
  try {
    const user = await User.create(req.body)

    // grab token and send to email
    const confirmEmailToken = user.generateEmailConfirmToken();

    // Create reset url
    const confirmEmailURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/secondchic/auth/confirmemail?token=${confirmEmailToken}`;

    const message = `You are receiving this email because you need to confirm your email address. Please make a GET request to: \n\n ${confirmEmailURL}`;

    user.save({ validateBeforeSave: false });

    const sendResult = await nodemailer.sendEmail({
      email: user.email,
      subject: 'Email confirmation token',
      message,
    });
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('ERROR', error)
    return next(error);
  }
}

/**
 * @description Authenticate user and generate token
 * @param {object} req - request object
 * @param {object} res - response object
 * @param {function} next - next middleware function
 * @returns {object} JSON response
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Validate email and password
    if (!username || !password) {
      return next(new ErrorResponse('Please provide an email and password', 400));
    }

    // Check for user
    const user = await User.findOne({
      $or: [
        { email: username },
        { phone: username },
      ]
    }).select("+password");

    if (!user) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new ErrorResponse('Invalid credentials', 401));
    }
    user.password
    sendTokenResponse(user, 200, res);   
    
    // // Get token
    // const token = user.getSignedJwtToken();

    // res.status(200).cookie('token', token).json({
    //   success: true,
    //   token,
    //   user: {
    //     id: user._id,
    //     firstName: user.firstName,
    //     lastName: user.lastName,
    //     email: user.email,
    //     phone: user.phone,
    //     dob: user.dob
    //   }
    // });
  } catch (error) {
    console.error('ERROR', error);
    return next(error);
  }
};

exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});


exports.sendEmail = async (req, res) => {
  await nodemailer.sendEmail({
    email: "muhammadfarhandh@gmail.com",
    subject: "Hello Subject",
    message: "Hello World body!"
  })
    res.send({data: 'Hello World'})
}

exports.getUserProfile = async (req, res) => {
    try {
        const user = req.user;
        res.status(200).json({
          success: true,
          data: user,
        });
    } catch (error) {
        console.error('ERROR', error)
    }
}


exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // Get reset token
  const resetToken = user.getResetPasswordToken();

  await user.save({ validateBeforeSave: false });

  // Create reset url
  const resetUrl = `${req.protocol}://${req.get(
    'host',
  )}/api/v1/auth/resetpassword/${resetToken}`;

  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

  try {
    await nodemailer.sendEmail({
      email: user.email,
      subject: 'Password reset token',
      message,
    });

    res.status(200).json({ success: true, data: 'Email sent' });
  } catch (err) {
    console.log(err);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});


exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto.createHash('sha256').update(req.params.resettoken).digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse('Invalid token', 400));
  }

  // Set new password
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});


exports.confirmEmail = asyncHandler(async (req, res, next) => {
  // grab token from email
  const { token } = req.query;

  if (!token) {
    return next(new ErrorResponse('Invalid Token', 400));
  }

  const splitToken = token.split('.')[0];
  const confirmEmailToken = crypto
    .createHash('sha256')
    .update(splitToken)
    .digest('hex');

  // get user by token
  const user = await User.findOne({
    confirmEmailToken,
    isEmailConfirmed: false,
  });

  if (!user) {
    return next(new ErrorResponse('Invalid Token', 400));
  }

  // update confirmed to true
  user.confirmEmailToken = undefined;
  user.isEmailConfirmed = true;

  // save
  user.save({ validateBeforeSave: false });

  // return token
  sendTokenResponse(user, 200, res);
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();
    res.status(statusCode).cookie('token', token).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        dob: user.dob
      }
    });
  };
  