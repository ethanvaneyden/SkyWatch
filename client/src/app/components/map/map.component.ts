import { Component, OnInit, AfterViewInit, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { WebsocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  private ws = inject(WebsocketService);
  private map!: L.Map;
  private aircraftMarkers = new Map<number, L.Marker>();
  private airportMarkers: L.Marker[] = [];

  ngOnInit() {
    this.listenForPositions();
    this.listenForAirports();
  }

  ngAfterViewInit() {
    this.initMap();
    this.requestAirports();
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap() {
    this.map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(this.map);
  }

  private requestAirports() {
    this.ws.send({ type: 'GET_AIRPORTS' });
  }

  private listenForAirports() {
    this.ws.messages$.subscribe(msg => {
      if (msg.type === 'AIRPORT_LIST') {
        this.renderAirports(msg.airports);
      }
    });
  }

  private renderAirports(airports: any[]) {
    // Clear old markers
    this.airportMarkers.forEach(m => m.remove());
    this.airportMarkers = [];

    const airportIcon = L.icon({
      iconUrl: 'assets/airport-marker.svg',
      iconSize: [25, 25],
      iconAnchor: [12, 12]
    });

    airports.forEach(ap => {
      const marker = L.marker([ap.latitude, ap.longitude], {
        title: `${ap.name} (${ap.code})`,
        icon: airportIcon
      }).addTo(this.map);
      marker.bindPopup(`<b>${ap.name}</b><br>${ap.city}, ${ap.country}`);
      this.airportMarkers.push(marker);
    });
  }

  private listenForPositions() {
    this.ws.messages$.subscribe(msg => {
      if (msg.type === 'POSITION') {
        this.updateAircraftMarker(msg);
      }
    });
  }

  private updateAircraftMarker(data: any) {
    let marker = this.aircraftMarkers.get(data.flight_id);
    
    const aircraftIcon = L.icon({
      iconUrl: 'assets/plane-marker.svg',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    if (!marker) {
      marker = L.marker([data.latitude, data.longitude], { icon: aircraftIcon }).addTo(this.map);
      marker.bindPopup(`Flight ${data.flight_id}`);
      this.aircraftMarkers.set(data.flight_id, marker);
    } else {
      marker.setLatLng([data.latitude, data.longitude]);
    }

    marker.setPopupContent(`
      <b>Flight ${data.flight_id}</b><br>
      Status: ${data.status}<br>
      Progress: ${data.progress.toFixed(1)}%
    `);
  }
}
