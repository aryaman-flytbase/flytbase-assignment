const express = require("express");
const app = express();
const httpServer = require("http").createServer(app);
const ROSLIB = require("roslib");
const io = require("socket.io")(httpServer, {
  cors: true,
  origin: ["*"],
});

const PORT = 3000;

let marker;
let nameSpaceGlobal;
// let myLatLngCoordinates = [];
let waypointsCoordinates = [];
let batteryInfo = [];

let ros = new ROSLIB.Ros({ url: "wss://dev.flytbase.com/websocket" });
ros.on("connection", (id) => {
  console.log("Connected to WEB SOCKET Server");
  RoslibConnection();
});
//Establishing connection
function RoslibConnection() {
  let authService = new ROSLIB.Service({
    ros: ros,
    name: "/websocket_auth",
    serviceType: "ParamGetGlobalNamespace",
  });
  let request = new ROSLIB.ServiceRequest({
    vehicleid: "b3L06t5K",
    authorization: "Token 840a74fac3dacbb093a609256cf7cc01fedadd9f",
  });
  authService.callService(request, async (result) => {
    if (result.success) {
      //Invoking ROS requests
      NamespaceCallService();
      getWaypoints();
      getBatteryInfo();
      getHudData();
    } else console.log("failed");
  });
}

//Namespace call service, FlytOS instance
function NamespaceCallService() {
  let namespace = new ROSLIB.Service({
    ros: ros,
    name: "/get_global_namespace",
    serviceType: "core_api/ParamGetGlobalNamespace",
  });
  let request = new ROSLIB.ServiceRequest({});

  namespace.callService(request, async (result) => {
    if (result.success) {
      nameSpaceGlobal = await result.param_info.param_value;
    } else console.log("namespace call service error");
  });
}

//Get list of waypoints
function getWaypoints() {
  var waypointGet = new ROSLIB.Service({
    ros: ros,
    name: "/flytsim/navigation/waypoint_get",
    serviceType: "core_api/WaypointGet",
  });

  var request = new ROSLIB.ServiceRequest({});

  waypointGet.callService(request, (result) => {
    waypointsCoordinates = result.waypoints?.map((item) => {
      if (item.command === 16) {
        let lat = item.x_lat;
        let lng = item.y_long;
        let obj = { lat: lat, lng: lng };
        return obj;
      }
      let obj = { lat: 0, lng: 0 };
      return obj;
    });
    waypointsCoordinates = waypointsCoordinates.filter((item) => {
      if (item.lat !== 0 && item.lng !== 0) return item;
    });
    // console.log(waypointsCoordinates);
  });
}

function getBatteryInfo() {
  let batteryData = new ROSLIB.Topic({
    ros: ros,
    name: `/${nameSpaceGlobal}/mavros/battery`,
    serviceType: "sensor_msgs/BatteryState",
    throttle_rate: 2000,
  });

  return batteryData;
}

function getHudData() {
  let vfrHUDData = new ROSLIB.Topic({
    ros: ros,
    name: `/${nameSpaceGlobal}/mavros/vfr_hud`,
    messageType: "mavros_msgs/VFR_HUD",
    throttle_rate: 2000,
  });
  return vfrHUDData;
}

function getQuaternionData() {
  let eularData = new ROSLIB.Topic({
    ros: ros,
    name: `/${nameSpaceGlobal}/mavros/imu/data`,
    messageType: "sensor_msgs/Imu",
    throttle_rate: 1000,
  });
  return eularData;
}

io.on("connection", (socket) => {
  let gpsData = new ROSLIB.Topic({
    ros: ros,
    name: `/${nameSpaceGlobal || "flytsim"}/mavros/global_position/global`,
    messageType: "sensor_msgs/NavSatFix",
    throttle_rate: 2000,
  });

  gpsData.subscribe((data) => socket.emit("gpsData", data));
  socket.emit("waypoints", waypointsCoordinates);
  getBatteryInfo().subscribe((data) => socket.emit("batteryInfo", data));
  getHudData().subscribe((data) => socket.emit("hudInfo", data));
  getQuaternionData().subscribe((data) => socket.emit("quaternionaInfo", data));

  console.log(" a user is connected---  from server.js");
});

httpServer.listen(PORT, () => {
  console.log("Server running on port :" + PORT);
});
