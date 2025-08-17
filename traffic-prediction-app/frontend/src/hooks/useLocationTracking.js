import { useState, useRef, useEffect } from 'react';

 const useLocationTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt');
  const [heading, setHeading] = useState(0);
  const [arrowIcon, setArrowIcon] = useState(null);

  const watchIdRef = useRef(null);
  const simulationIntervalRef = useRef(null);

  useEffect(() => {
    if (window.google?.maps?.Symbol) {
      setArrowIcon({
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#4F46E5',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        rotation: 0,
      });
    }
  }, []);

  // Listen to changes in geolocation permission and update state reactively
  useEffect(() => {
    let permissionStatus;

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((status) => {
        setLocationPermission(status.state);
        permissionStatus = status;

        status.onchange = () => {
          setLocationPermission(status.state);
        };
      });
    }

    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  const requestLocationPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setLocationPermission(result.state);

      if (result.state === 'denied') {
        return false;
      }

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => {
            resolve(false);
          }
        );
      });
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  const startTracking = (route, navigationCallbacks) => {
    const { setCurrentStep, setNextInstruction, setDistanceToNext, setEstimatedTime } = navigationCallbacks;

    setIsTracking(true);
    const steps = route.legs[0].steps;

    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          setCurrentPosition((prevPosition) => {
            if (prevPosition) {
              const angle = window.google.maps.geometry.spherical.computeHeading(
                new window.google.maps.LatLng(prevPosition.lat, prevPosition.lng),
                new window.google.maps.LatLng(newPosition.lat, newPosition.lng)
              );
              setHeading(angle);
            }
            return newPosition;
          });

          setCurrentStep((currentStep) => {
            if (steps[currentStep + 1]) {
              const distanceToNextStep = window.google.maps.geometry.spherical.computeDistanceBetween(
                new window.google.maps.LatLng(newPosition.lat, newPosition.lng),
                steps[currentStep + 1].start_location
              );

              if (distanceToNextStep < 50) {
                setNextInstruction(steps[currentStep + 1].instructions);
                setDistanceToNext(steps[currentStep + 1].distance.text);

                const remainingSteps = steps.slice(currentStep + 1);
                const remainingTime = remainingSteps.reduce((acc, step) => acc + step.duration.value, 0);
                setEstimatedTime(Math.round(remainingTime / 60) + ' mins');

                return currentStep + 1;
              }
            }
            return currentStep;
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          stopTracking();
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
        }
      );
    }
  };

  const simulateMovement = (routeIndex, directions) => {
    const route = directions[routeIndex];
    const path = route.legs[0].steps.flatMap((step) =>
      window.google.maps.geometry.encoding.decodePath(step.polyline.points)
    );

    let currentIdx = 0;

    simulationIntervalRef.current = setInterval(() => {
      if (currentIdx < path.length - 1) {
        const currentPoint = path[currentIdx];
        const nextPoint = path[currentIdx + 1];

        const heading = window.google.maps.geometry.spherical.computeHeading(currentPoint, nextPoint);

        setHeading(heading);
        setCurrentPosition({
          lat: currentPoint.lat(),
          lng: currentPoint.lng(),
        });

        currentIdx++;
      } else {
        stopTracking();
      }
    }, 1000);
  };

  const stopTracking = () => {
    setIsTracking(false);
    setCurrentPosition(null);

    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    currentPosition,
    locationPermission,
    heading,
    arrowIcon,
    startTracking,
    stopTracking,
    simulateMovement,
    requestLocationPermission,
  };
};

export default useLocationTracking;
