import { Injectable } from '@angular/core';
import * as ROSLIB from 'roslib';
import { MyLatLng } from './coordinates';
@Injectable({
  providedIn: 'root',
})
export class RoslibService {
  //Create ros websocket connection
  nameSpaceGlobal: string;
  ros = new ROSLIB.Ros({ url: 'wss://dev.flytbase.com/websocket' });

  public myLatLngCoordinates = [];
  public waypointsCoordinates: any = [];
  marker: any;

  //Namespace API common function
  GlobalNamespace(ros: any, name: any, serviceType: any = ''): any {
    let namespace = new ROSLIB.Service({
      ros: ros,
      name: name,
      serviceType: serviceType,
    });
    return namespace;
  }

  //Establishing connection
  RoslibConnection(): void {
    let authService = this.GlobalNamespace(
      this.ros,
      '/websocket_auth',
      'ParamGetGlobalNamespace'
    );
    let request = new ROSLIB.ServiceRequest({
      vehicleid: 'b3L06t5K',
      authorization: 'Token 840a74fac3dacbb093a609256cf7cc01fedadd9f',
    });

    authService.callService(request, async (result: any) => {
      if (result.success) {
        //Invoking ROS requests
        //TODO: chain thise functions in promise
        this.namespaceCallService();
        this.getWaypoints();
        // this.takeOffService();
      } else console.log('failed');
    });
  }

  //Namespace call service, FlytOS instance
  namespaceCallService(): void {
    let namespace = this.GlobalNamespace(
      this.ros,
      '/get_global_namespace',
      'core_api/ParamGetGlobalNamespace'
    );
    let request = new ROSLIB.ServiceRequest({});

    namespace.callService(request, async (result: any) => {
      if (result.success) {
        this.nameSpaceGlobal = await result.param_info.param_value;
        console.log(this.nameSpaceGlobal);
      } else console.log('namespace call service error');
    });
  }

  //Take Off API
  takeOffService(value: number): void {
    let takeOff = new ROSLIB.Service({
      ros: this.ros,
      name: `/${this.nameSpaceGlobal || 'flytsim'}/navigation/take_off`,
      serviceType: 'core_api/TakeOff',
    });

    let request = new ROSLIB.ServiceRequest({
      takeoff_alt: value,
    });

    takeOff.callService(request, (result: any) => {
      if ((result.success, takeOff.name)) {
        console.log(result);
      } else console.log('take off error');
    });
  }

  //Global Position API
  globalPosition(): any {
    let gpsData = new ROSLIB.Topic({
      ros: this.ros,
      name: `/${
        this.nameSpaceGlobal || 'flytsim'
      }/mavros/global_position/global`,
      messageType: 'sensor_msgs/NavSatFix',
      throttle_rate: 2000,
    });

    gpsData.subscribe((data: any) => {
      this.myLatLngCoordinates = data;

      this.placeMarker(this.myLatLngCoordinates);
    });
    console.log('1321',this.myLatLngCoordinates);

    // console.log(this.myLatLngCoordinates);
  }

  map: google.maps.Map;

  initMap(el: string): void {
    const image =
      'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png';

    let myLatLng = { lat: 28.6517178, lng: 77.2219388 };
    let myOptions = {
      zoom: 17,
      center: myLatLng,
      // mapTypeId: google.maps.MapTypeId.ROADMAP,
      icon: '/assets/drone.png',
    };

    this.map = new google.maps.Map(
      document.getElementById(el) as HTMLElement,
      myOptions
    );

    this.marker = new google.maps.Marker({
      position: new google.maps.LatLng(
        Number(myLatLng.lat),
        Number(myLatLng.lng)
      ),
    });

    this.marker.setMap(this.map);
  }

  placeMarker(myLatLng: any): void {
    // console.log(myLatLng.longitude, myLatLng.latitude);
    if (this.marker && this.marker.setMap) {
      this.marker.setMap(null);
    }

    this.marker = new google.maps.Marker({
      position: new google.maps.LatLng(
        Number(myLatLng.latitude),
        Number(myLatLng.longitude)
      ),
      icon: '/assets/drone.png',
    });
    this.marker.setMap(this.map);

    this.map.panTo(
      new google.maps.LatLng(
        Number(myLatLng.latitude),
        Number(myLatLng.longitude)
      )
    );
  }

  //Get list of waypoints
  getWaypoints(): void {
    var waypointGet = new ROSLIB.Service({
      ros: this.ros,
      name: '/flytsim/navigation/waypoint_get',
      serviceType: 'core_api/WaypointGet',
    });

    var request = new ROSLIB.ServiceRequest({});

    waypointGet.callService(request, (result) => {
      this.waypointsCoordinates = result.waypoints?.map((item: any) => {
        if (item.command === 16) {
          let lat = item.x_lat;
          let lng = item.y_long;
          let obj = { lat: lat, lng: lng };
          return obj;
        }
        let obj = { lat: 0, lng: 0 };
        return obj;
      });
      this.waypointsCoordinates = this.waypointsCoordinates.filter(
        (item: any) => {
          if (item.lat !== 0 && item.lng !== 0) return item;
        }
      );
    });

    // console.log(this.waypointsCoordinates);
    setTimeout(() => {
      this.placeWaypoints();
    }, 1000);
  }

  placeWaypoints(): void {
    const flightPath = new google.maps.Polyline({
      path: this.waypointsCoordinates,
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2,
    });

    flightPath.setMap(this.map);
  }

  RoslibConnect(): void {
    this.ros.on('connection', (id) => {
      console.log('web socket established ');
      this.RoslibConnection();
    });
    this.initMap('gmap');
  }
  constructor() {}
}
