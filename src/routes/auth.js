const express = require("express");
const authController = require("../controllers/auth");

const { protect } = require('../middleware/auth');
//--//
let routes = function(){
    let routes = express.Router({mergeParams: true});
    //--//
    routes.route("/signup").post(authController.signup);
    routes.route("/login").post(authController.login);
    routes.route("/logout").post([protect], authController.logout);
    routes.route("/profile").get([protect], authController.getUserProfile);
    routes.route("/confirmemail").get(authController.confirmEmail);
    routes.route("/forgot").post(authController.forgotPassword);
    routes.route("/resetpassword/:resettoken").put(authController.resetPassword);
    //--//
    return routes;
};
//--//
module.exports = routes;