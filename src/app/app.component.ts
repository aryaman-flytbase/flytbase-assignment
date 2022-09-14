/// <reference types="@types/googlemaps" />
import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
// import { RoslibService } from './roslib.service';
import { SocketIoService } from './socket-io.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [],
})
export class AppComponent implements OnInit {
  title = 'assignment';
  batteryPercentage: number;
  airSpeed: number;
  altitude: number;

  public myLatLngCoordinates = [];

  takeOff(event: any): void {
    // this.RoslibService.takeOffService(5.0);
  }

  //Get battery info
  getBatteryInfo() {
    return new Observable((observer) => {
      this.socketIoService.socket.on('batteryInfo', (batteryInfo: any) => {
        this.batteryPercentage = Math.abs(
          +(batteryInfo.percentage * 100).toFixed(2)
        );
      });
    });
  }

  //get VFG HUD data
  getHudData() {
    return new Observable((observer) => {
      this.socketIoService.socket.on('hudInfo', (value: any) => {
        this.airSpeed = Math.abs(+(value.airspeed * 100).toFixed(2));
        this.altitude = Math.abs(+value.altitude.toFixed(2));
      });
    });
  }

  //Get Eular Data (Speed, Yaw, roll)
  getQuaternionaData() {
    return new Observable((observer) => {
      this.socketIoService.socket.on('quaternionaInfo', (value: any) => {
        let x = value.orientation.x;
        let y = value.orientation.y;
        let z = value.orientation.z;
        let w = value.orientation.w;
        // var yaw = Math.atan2(2.0*(q.y*q.z + q.w*q.x), q.w*q.w - q.x*q.x - q.y*q.y + q.z*q.z);
        console.log(value);
      });
    });
  }

  ngOnInit() {
    // this.RoslibService.RoslibConnect();
    // this.WebsocketService.ngOnInit()
    // this.RoslibService.globalPosition();

    this.socketIoService.initMap('gmap');
    this.socketIoService.connect();
    this.socketIoService.onNewMessage().subscribe();
    this.socketIoService.getWaypoints().subscribe();

    this.getBatteryInfo().subscribe();
    this.getHudData().subscribe();
    this.getQuaternionaData().subscribe();
  }

  constructor(
    // private RoslibService: RoslibService,
    private socketIoService: SocketIoService
  ) {}
}
