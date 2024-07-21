import { useMap } from '@/services/MapContext';
import { GoogleMap, LoadScript } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

const ZOOM_THRESHOLD = 15; // Minimum zoom level to show labels

export default function MapComponent() {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const { maxPrice } = useMap();

  const { data: geoJsonData } = useQuery<any>({
    queryKey: ['postcodes.json'],
  });

  useEffect(() => {
    if (mapRef.current && geoJsonData && isMapLoaded) {
      try {
        setTimeout(() => {
          mapRef.current!.data.addGeoJson(geoJsonData);
          mapRef.current!.data.setStyle((feature) => {
            const averagePrice = feature.getProperty('averagePrice') as number;
            if (maxPrice > averagePrice) {
              return {
                fillColor: 'blue',
                fillOpacity: 0.02,
                strokeColor: 'blue',
                strokeWeight: 1,
              };
            } else {
              return {
                fillColor: 'black',
                fillOpacity: 0.01,
                strokeColor: 'black',
                strokeWeight: 0.2,
              };
            }
          });

          // Create markers for labels
          const newMarkers: google.maps.Marker[] = [];
          mapRef.current!.data.forEach((feature) => {
            const bounds = new google.maps.LatLngBounds();
            feature.getGeometry()?.forEachLatLng((latLng: google.maps.LatLng) => {
              bounds.extend(latLng);
            });
            const center = bounds.getCenter();
            const postnummer = feature.getProperty('postnummer') as string;
            const marker = new google.maps.Marker({
              position: center,
              map: mapRef.current,
              label: {
                text: postnummer,
                color: 'black',
                fontSize: '14px',
                fontWeight: 'bold',
              },
              icon: 'http://maps.google.com/mapfiles/ms/micons/blank.png', // Blank icon to avoid default markers
              visible: false, // Initially set markers to not visible
            });

            newMarkers.push(marker);
          });

          setMarkers(newMarkers);
        }, 500); // Adjust the delay time as needed
      } catch (error) {
        console.error('Error adding GeoJSON to map:', error);
      }
    }
  }, [geoJsonData, isMapLoaded, maxPrice]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      const handleZoomChange = () => {
        const zoom = map.getZoom();
        if (!zoom) return;
        markers.forEach((marker) => {
          marker.setMap(zoom >= ZOOM_THRESHOLD ? map : null);
        });
      };

      const updateMarkersVisibility = () => {
        if (!map) return;
        const bounds = map.getBounds();
        if (!bounds) return;

        markers.forEach((marker) => {
          const position = marker.getPosition();
          const zoom = map.getZoom();
          if (!zoom) return;
          if (position) {
            marker.setVisible(bounds.contains(position) && zoom >= ZOOM_THRESHOLD);
          }
        });
      };

      // Add zoom change listener
      const zoomListener = google.maps.event.addListener(map, 'zoom_changed', () => {
        handleZoomChange();
        updateMarkersVisibility();
      });

      // Add bounds change listener to update marker visibility based on viewport
      const boundsListener = google.maps.event.addListener(map, 'bounds_changed', updateMarkersVisibility);

      // Initial call to set visibility based on the current zoom level and viewport
      handleZoomChange();
      updateMarkersVisibility();

      return () => {
        // Clean up listeners on component unmount
        google.maps.event.removeListener(zoomListener);
        google.maps.event.removeListener(boundsListener);
      };
    }
  }, [markers]);

  return (
    <div className='m-4'>
      <LoadScript googleMapsApiKey='AIzaSyDjzl1rWqcUAVMLCIrLFUYrJAqWgKUmqAs'>
        <GoogleMap
          mapContainerStyle={{
            width: '100%',
            height: '85vh',
          }}
          center={{
            lat: 59.93,
            lng: 10.75,
          }}
          zoom={11}
          options={{ mapId: '42cab03dda42e877' }}
          onLoad={(map) => {
            mapRef.current = map;
            setIsMapLoaded(true);
          }}
        >
          {/* Child components, such as markers, info windows, etc. */}
        </GoogleMap>
      </LoadScript>
    </div>
  );
}
