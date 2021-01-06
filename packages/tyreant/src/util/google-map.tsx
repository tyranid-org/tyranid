import * as React from 'react';

import { Spin } from 'antd';

import { registerComponent } from '../common';

import {
  GoogleMap,
  useJsApiLoader,
  DirectionsService,
  InfoWindow,
  Marker,
  Polyline,
  DirectionsRenderer,
} from '@react-google-maps/api';

import { Tyr } from 'tyranid/client';

const getLatLongStr = (point?: google.maps.LatLngLiteral) => {
  if (point) {
    return `${point.lat},${point.lng}`;
  }

  return undefined;
};

export type MapPoint = {
  point: google.maps.LatLngLiteral;
  markerLabel: string;
  infoHtml?: string | JSX.Element;
  icon?: string;
};

export type MapRoute = {
  origin: MapPoint;
  waypoints?: MapPoint[];
  destination: MapPoint;
  lineColor?: string;
  straight?: boolean;
  infoHtml?: JSX.Element;
};

const mapIconUrls: { [k: string]: string } = {
  green: 'https://maps.google.com/mapfiles/ms/icons/green.png',
  blue: 'https://maps.google.com/mapfiles/ms/icons/blue.png',
  purple: 'https://maps.google.com/mapfiles/ms/icons/purple.png',
};

type PointMarkerProps = {
  mapPoint: MapPoint;
  onClick: () => void;
  iconMap?: { [key: string]: string };
};

const PointMarker = (props: PointMarkerProps) => {
  const { mapPoint, onClick, iconMap } = props;
  const { markerLabel, icon } = mapPoint;

  const iconUrl = icon ? mapIconUrls[icon] || iconMap?.[icon] : undefined;

  return (
    <Marker
      label={{
        color: 'white',
        text: markerLabel || 'A',
      }}
      position={mapPoint.point}
      onClick={onClick}
      {...(iconUrl
        ? {
            icon: {
              url: iconUrl,
              anchor: new google.maps.Point(32, 32),
              scaledSize: new google.maps.Size(64, 64),
            },
          }
        : {})}
    />
  );
};

export interface MapProps {
  mapRoutes?: MapRoute[];
  mapPoints?: MapPoint[];
  iconMap?: { [k: string]: string };
  height: string;
  width: string;
  zoom?: number;
  mapOptions?: google.maps.MapOptions;
}

export const TyrGoogleMap = (props: MapProps) => {
  const { height, width, mapRoutes, mapPoints, iconMap, mapOptions } = props;

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: (Tyr.options as any).google.map.apiKey,
  });

  const [directionsRequest, setDirectionsRequest] = React.useState<
    google.maps.DirectionsRequest
  >();

  const [directionsResponse, setDirectionsResponse] = React.useState<
    google.maps.DirectionsResult
  >();

  const [mapCenter, setMapCenter] = React.useState<google.maps.LatLngLiteral>();
  const [mapZoom, setMapZoom] = React.useState<number>(10);
  const [activeMarker, setActiveMarker] = React.useState<MapPoint>();
  const [routeInfoPoint, setRouteInfoPoint] = React.useState<MapPoint>();
  const [straightRoutes] = React.useState<MapRoute[]>(
    props.mapRoutes ? props.mapRoutes.filter(mr => !!mr.straight) : []
  );
  const [roadRoutes] = React.useState<MapRoute[]>(
    props.mapRoutes ? props.mapRoutes.filter(mr => !mr.straight) : []
  );

  const onLoad = React.useCallback(function callback(map) {
    const bounds = new (window as any).google.maps.LatLngBounds();
    map.fitBounds(bounds);
    //setMap(map); // Do I need this anymore?
  }, []);

  const onUnmount = React.useCallback(function callback(map) {
    //setMap(null);
  }, []);

  React.useEffect(() => {
    if (isLoaded) {
      if (roadRoutes) {
        roadRoutes.forEach(roadRoute => {
          const originLatLong = roadRoute.origin.point;
          const destLatLong = roadRoute.destination.point;

          setDirectionsRequest({
            origin: originLatLong,
            destination: destLatLong,
            waypoints: roadRoute.waypoints
              ? roadRoute.waypoints.map(r => ({
                  location: getLatLongStr(r.point),
                }))
              : [],
            travelMode: google.maps.TravelMode.DRIVING,
          });
        });
      }
    }
  }, [isLoaded]);

  React.useEffect(() => {
    if (isLoaded) {
      if (mapRoutes && mapRoutes.length) {
        const firstLine = mapRoutes[0];

        setTimeout(() => {
          setMapCenter(firstLine.origin.point);
          setMapZoom(5);
        }, 500);
      } else if (mapPoints && mapPoints.length) {
        setTimeout(() => {
          setMapCenter(mapPoints[0].point);
          setMapZoom(5);
        }, 500);
      }
    }
  }, [isLoaded, mapRoutes, mapPoints]);

  if ((!mapPoints && !mapRoutes) || !isLoaded) {
    return <Spin />;
  }

  if (loadError) {
    return <div>Map cannot be loaded right now, sorry.</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={{ height, width, position: 'relative' }}
      center={mapCenter}
      zoom={mapZoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={mapOptions}
    >
      {activeMarker && (
        <InfoWindow
          key="m1"
          position={activeMarker.point}
          onCloseClick={() => {
            setActiveMarker(undefined);
          }}
        >
          <div>{activeMarker ? activeMarker.infoHtml || '' : ''}</div>
        </InfoWindow>
      )}

      {routeInfoPoint && (
        <InfoWindow
          key="r1"
          position={routeInfoPoint.point}
          onCloseClick={() => {
            setRouteInfoPoint(undefined);
          }}
        >
          <div>{routeInfoPoint ? routeInfoPoint.infoHtml || '' : ''}</div>
        </InfoWindow>
      )}

      {directionsRequest && (
        <DirectionsService
          options={directionsRequest}
          callback={(result, status) => {
            setDirectionsRequest(undefined);

            if (status === google.maps.DirectionsStatus.OK) {
              setDirectionsResponse(result);
            } else {
              setDirectionsResponse(undefined);
            }
          }}
        />
      )}

      {directionsResponse && (
        <DirectionsRenderer
          options={{
            directions: directionsResponse,
          }}
        />
      )}

      {straightRoutes &&
        straightRoutes.map((straightRoute, idx) => {
          const { origin, destination, waypoints } = straightRoute;

          const path = [origin.point];

          if (waypoints) {
            path.push(...waypoints.map(wp => wp.point));
          }

          path.push(destination.point);

          return (
            <React.Fragment key={idx}>
              <Polyline
                key={idx}
                options={{
                  path,
                  geodesic: true,
                  strokeColor: straightRoute.lineColor || '#5CADE2',
                  strokeOpacity: 0.6,
                  strokeWeight: 5,
                }}
                onMouseOver={e => {
                  if (straightRoute.infoHtml) {
                    setRouteInfoPoint({
                      point: { lat: e.latLng.lat(), lng: e.latLng.lng() },
                      infoHtml: <div>{straightRoute.infoHtml}</div>,
                      markerLabel: '',
                    });
                  }
                }}
              />
              <PointMarker
                mapPoint={origin}
                key={`o-${idx}`}
                onClick={() => {
                  setActiveMarker({
                    point: origin.point,
                    markerLabel: origin.markerLabel,
                    infoHtml: origin.infoHtml,
                    icon: origin.icon,
                  });
                }}
                iconMap={iconMap}
              />
              {waypoints &&
                waypoints.map((wp, wpIdx) => (
                  <PointMarker
                    mapPoint={wp}
                    key={`wp-${wpIdx}`}
                    onClick={() => {
                      setActiveMarker({
                        point: wp.point,
                        markerLabel: wp.markerLabel,
                        infoHtml: wp.infoHtml,
                        icon: wp.icon,
                      });
                    }}
                    iconMap={iconMap}
                  />
                ))}

              <PointMarker
                mapPoint={destination}
                key={`d-${idx}`}
                onClick={() => {
                  setActiveMarker({
                    point: destination.point,
                    markerLabel: destination.markerLabel,
                    infoHtml: destination.infoHtml,
                    icon: destination.icon,
                  });
                }}
                iconMap={iconMap}
              />
            </React.Fragment>
          );
        })}

      {mapPoints &&
        mapPoints.map((mapPoint, idx) => (
          <PointMarker
            mapPoint={mapPoint}
            key={idx}
            onClick={() => {
              setActiveMarker({
                point: mapPoint.point,
                markerLabel: mapPoint.markerLabel,
                infoHtml: mapPoint.infoHtml,
                icon: mapPoint.icon,
              });
            }}
            iconMap={iconMap}
          />
        ))}
    </GoogleMap>
  );
};

registerComponent('TyrGoogleMap', TyrGoogleMap);

export default TyrGoogleMap;
