import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class SocketIoService {
  socket: Socket;
  public myLatLngCoordinates = [];
  marker: any;

  constructor() {}

  connect(): void {
    this.socket = io('http://localhost:3000/');
    console.log('connected');
  }

  //Get Drone coordinates
  onNewMessage() {
    return new Observable((observer) => {
      this.socket.on('gpsData', (gpsData) => {
        this.myLatLngCoordinates = gpsData;
        this.placeMarker(this.myLatLngCoordinates);
      });
    });
  }

  //Get mission way points
  getWaypoints() {
    return new Observable((observer) => {
      this.socket.on('waypoints', (waypoints) => {
        this.placeWaypoints(waypoints);
      });
    });
  }

  //Create google map instacne
  map: google.maps.Map;

  //Google map init method
  initMap(el: string): void {
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
  placeWaypoints(waypointsCoordinates: any): void {
    // console.log(waypointsCoordinates);

    const flightPath = new google.maps.Polyline({
      path: waypointsCoordinates,
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2,
    });

    flightPath.setMap(this.map);
  }
}
