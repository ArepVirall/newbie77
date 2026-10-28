import React, { useEffect, useRef } from 'react';
import { AttendanceRecord, AdminSettings, WorkLocation } from '../types';
import L from 'leaflet';

interface LeafletMapProps {
  settings: AdminSettings;
  workLocations?: WorkLocation[];
  attendances?: AttendanceRecord[];
  selectedAttendance?: AttendanceRecord | null;
  onSelectAttendance?: (att: AttendanceRecord) => void;
  interactiveMode?: boolean; // When true, clicking map emits selected coordinates
  onMapClick?: (lat: number, lng: number) => void;
  tempMarker?: { latitude: number; longitude: number; name?: string; radiusMeters?: number } | null;
  height?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  settings,
  workLocations = [],
  attendances = [],
  selectedAttendance,
  onSelectAttendance,
  interactiveMode = false,
  onMapClick,
  tempMarker,
  height = '420px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const locationsLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tempMarkerLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const centerLat = workLocations.length > 0 ? workLocations[0].latitude : settings.officeLatitude || -6.2088;
    const centerLng = workLocations.length > 0 ? workLocations[0].longitude : settings.officeLongitude || 106.8456;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      locationsLayerRef.current = L.layerGroup().addTo(map);
      markersLayerRef.current = L.layerGroup().addTo(map);
      tempMarkerLayerRef.current = L.layerGroup().addTo(map);

      map.on('click', (e: L.LeafletMouseEvent) => {
        if (onMapClick) {
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Work Locations & 300m Radius Circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const locationsLayer = locationsLayerRef.current;
    if (!map || !locationsLayer) return;

    locationsLayer.clearLayers();

    // If no workLocations passed, fallback to settings.office
    const list =
      workLocations.length > 0
        ? workLocations
        : [
            {
              id: 'default',
              name: settings.officeName,
              address: 'Kantor Pusat',
              latitude: settings.officeLatitude,
              longitude: settings.officeLongitude,
              radiusMeters: settings.defaultRadiusMeters || 300,
              assignedTechIds: [],
              isActive: true,
              createdAt: '',
            },
          ];

    list.forEach((loc) => {
      if (!loc.isActive) return;

      const officeIcon = L.divIcon({
        className: 'office-custom-marker',
        html: `<div style="background-color: #0284c7; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid white; font-size: 16px;">🏢</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      L.marker([loc.latitude, loc.longitude], { icon: officeIcon })
        .addTo(locationsLayer)
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px;">
            <b style="font-size: 13px; color: #0284c7;">${loc.name}</b><br/>
            <span style="color: #64748b;">${loc.address || ''}</span><br/>
            <span style="display: inline-block; margin-top: 4px; padding: 2px 6px; background: #e0f2fe; color: #0369a1; border-radius: 4px; font-weight: bold; font-size: 10px;">
              Radius Wajib: ${loc.radiusMeters} meter
            </span>
          </div>
        `);

      // 300m Radius Boundary
      L.circle([loc.latitude, loc.longitude], {
        radius: loc.radiusMeters || 300,
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(locationsLayer);
    });
  }, [workLocations, settings]);

  // Update Technician Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    attendances.forEach((att) => {
      if (!att.latitude || !att.longitude) return;

      const isLate = att.lateStatus === 'TERLAMBAT';
      const isPulang = att.type === 'pulang';

      const pinColor = isPulang ? '#0ea5e9' : isLate ? '#ef4444' : '#10b981';
      const labelSymbol = isPulang ? '🏁' : isLate ? '⚠️' : '✓';

      const techIcon = L.divIcon({
        className: 'tech-custom-marker',
        html: `<div style="background-color: ${pinColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.35); border: 2px solid white; font-weight: bold; font-size: 14px;">${labelSymbol}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupContent = document.createElement('div');
      popupContent.style.minWidth = '220px';
      popupContent.innerHTML = `
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4;">
          <div style="font-weight: bold; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${att.technicianName}</div>
          <div style="color: #64748b; font-size: 11px; margin-bottom: 5px;">${att.technicianCode} &bull; ${att.technicianPhone}</div>
          <div style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; margin-bottom: 5px; background-color: ${
            isLate ? '#fee2e2' : '#dcfce7'
          }; color: ${isLate ? '#b91c1c' : '#15803d'};">
            ${att.type.toUpperCase()}: ${att.lateStatus} (${att.localTimeWib})
          </div>
          <div style="color: #334155; font-size: 11px;"><b>Lokasi Absen:</b> ${att.workLocationName || att.locationName}</div>
          <div style="color: #64748b; font-size: 10px;">
            Jarak: <b>${att.distanceToOfficeMeters} meter</b> (&le; ${att.maxAllowedRadiusMeters || 300}m) &bull; Akurasi: &plusmn;${att.accuracy}m
          </div>
          ${
            att.photoBase64
              ? `<img src="${att.photoBase64}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-top: 6px;" alt="Foto Absen" />`
              : ''
          }
        </div>
      `;

      const marker = L.marker([att.latitude, att.longitude], { icon: techIcon })
        .addTo(markersGroup)
        .bindPopup(popupContent);

      marker.on('click', () => {
        if (onSelectAttendance) onSelectAttendance(att);
      });
    });

    if (selectedAttendance && selectedAttendance.latitude && selectedAttendance.longitude) {
      map.setView([selectedAttendance.latitude, selectedAttendance.longitude], 16, { animate: true });
    }
  }, [attendances, selectedAttendance, onSelectAttendance]);

  // Update Temporary Selection Marker (When admin is picking location)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const tempGroup = tempMarkerLayerRef.current;
    if (!map || !tempGroup) return;

    tempGroup.clearLayers();

    if (tempMarker && tempMarker.latitude && tempMarker.longitude) {
      const pinIcon = L.divIcon({
        className: 'temp-marker',
        html: `<div style="background-color: #f59e0b; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5); border: 3px solid white; font-size: 18px; animation: bounce 1s infinite;">📍</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker([tempMarker.latitude, tempMarker.longitude], { icon: pinIcon })
        .addTo(tempGroup)
        .bindPopup(`<b>Titik Terpilih:</b><br/>${tempMarker.name || 'Lokasi Baru'}<br/>Radius: ${tempMarker.radiusMeters || 300}m`)
        .openPopup();

      L.circle([tempMarker.latitude, tempMarker.longitude], {
        radius: tempMarker.radiusMeters || 300,
        color: '#f59e0b',
        fillColor: '#fbbf24',
        fillOpacity: 0.25,
        weight: 2,
        dashArray: '4, 4',
      }).addTo(tempGroup);

      map.setView([tempMarker.latitude, tempMarker.longitude], 15, { animate: true });
    }
  }, [tempMarker]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {interactiveMode && (
        <div className="absolute top-3 left-12 z-[1000] bg-amber-500/90 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow backdrop-blur-sm pointer-events-none">
          Ketuk peta untuk menentukan titik koordinat lokasi kerja
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md text-[11px] flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <span className="w-3 h-3 rounded-full bg-sky-600 inline-block"></span>
          <span>Titik Lokasi Kerja Resmi</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <span className="w-3 h-3 rounded-full border-2 border-sky-500 bg-sky-100 dark:bg-sky-950 inline-block"></span>
          <span>Batas Wajib 300 Meter</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
          <span>Hadir Tepat Waktu (&le; 08:30 WIB)</span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
          <span>Hadir Terlambat (&gt; 08:30 WIB)</span>
        </div>
      </div>
    </div>
  );
};
