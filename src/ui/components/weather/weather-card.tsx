// src/ui/components/weather/weather-card.tsx
"use client";

import { useState, useEffect } from "react";
import { 
  Sun, 
  Cloud, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  Compass,
  Eye,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { weatherService, WeatherData } from "~/lib/services/weather-service";
import { toast } from "sonner";

interface WeatherCardProps {
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string;
}

const getWeatherIcon = (iconCode: string) => {
  switch (iconCode) {
    case '01d':
    case '01n':
      return <Sun className="h-8 w-8 text-yellow-500" />;
    case '02d':
    case '02n':
    case '03d':
    case '03n':
      return <Cloud className="h-8 w-8 text-gray-400" />;
    case '04d':
    case '04n':
      return <Cloud className="h-8 w-8 text-gray-500" />;
    case '09d':
    case '09n':
    case '10d':
    case '10n':
      return <CloudRain className="h-8 w-8 text-blue-500" />;
    case '11d':
    case '11n':
      return <CloudLightning className="h-8 w-8 text-yellow-600" />;
    case '13d':
    case '13n':
      return <CloudSnow className="h-8 w-8 text-blue-300" />;
    case '50d':
    case '50n':
      return <CloudFog className="h-8 w-8 text-gray-400" />;
    default:
      return <Sun className="h-8 w-8 text-yellow-500" />;
  }
};

const getWindDirection = (degrees: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

export const WeatherCard = ({ latitude, longitude, locationName }: WeatherCardProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWeather = async (showRefreshToast = false) => {
    try {
      if (!latitude || !longitude) {
        setError("Location coordinates not available");
        setLoading(false);
        return;
      }

      const data = await weatherService.getWeatherByCoords(latitude, longitude);
      
      if (data) {
        setWeather(data);
        setError(null);
        if (showRefreshToast) {
          toast.success("Weather data updated");
        }
      } else {
        setError("Unable to fetch weather data");
      }
    } catch (err) {
      console.error("Weather fetch error:", err);
      setError("Failed to load weather data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    
    // Refresh every 30 minutes
    const interval = setInterval(() => fetchWeather(), 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [latitude, longitude]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWeather(true);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#2e7d32]" />
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">{error || "Weather data unavailable"}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 flex items-center gap-2 rounded-lg bg-[#2e7d32] px-3 py-1.5 text-sm text-white hover:bg-[#1b5e20]"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">Weather</h3>
          <p className="text-xs text-gray-500">
            {locationName || `${latitude?.toFixed(2)}°, ${longitude?.toFixed(2)}°`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="text-xs text-gray-400">
            Updated {new Date(weather.last_updated).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Current Weather */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {getWeatherIcon(weather.current.icon)}
          <div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {weather.current.temperature}°C
            </p>
            <p className="text-sm text-gray-500 capitalize">
              {weather.current.description}
            </p>
            <p className="text-xs text-gray-400">
              Feels like {weather.current.feels_like}°C
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Droplets className="h-4 w-4" />
            <span>{weather.current.humidity}%</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
            <Wind className="h-4 w-4" />
            <span>{weather.current.wind_speed} km/h</span>
          </div>
          {weather.current.rainfall > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mt-1">
              <CloudRain className="h-4 w-4" />
              <span>{weather.current.rainfall} mm/h</span>
            </div>
          )}
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 rounded-lg dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Pressure</p>
            <p className="text-sm font-medium">{weather.current.pressure} hPa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-gray-500" />
          <div>
            <p className="text-xs text-gray-500">Wind Direction</p>
            <p className="text-sm font-medium">
              {getWindDirection(weather.current.wind_deg)} ({weather.current.wind_deg}°)
            </p>
          </div>
        </div>
      </div>

      {/* 5-Day Forecast */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">5-Day Forecast</p>
        <div className="grid grid-cols-5 gap-2">
          {weather.forecast.map((day, i) => (
            <div key={i} className="text-center">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {day.day}
              </p>
              <div className="my-1">
                {getWeatherIcon(day.icon)}
              </div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">
                {Math.round(day.temp_max)}°
              </p>
              <p className="text-xs text-gray-500">
                {Math.round(day.temp_min)}°
              </p>
              {day.rainfall > 0 && (
                <p className="text-[10px] text-blue-600 dark:text-blue-400">
                  {day.rainfall}mm
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Agricultural Advisory */}
      {weather.current.rainfall > 5 && (
        <div className="mt-4 p-2 bg-blue-50 rounded-lg dark:bg-blue-900/20">
          <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
            <CloudRain className="h-3 w-3" />
            Heavy rainfall expected - Consider postponing field operations
          </p>
        </div>
      )}
      {weather.current.wind_speed > 30 && (
        <div className="mt-4 p-2 bg-yellow-50 rounded-lg dark:bg-yellow-900/20">
          <p className="text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
            <Wind className="h-3 w-3" />
            High winds - Check crop supports and irrigation equipment
          </p>
        </div>
      )}
      {weather.current.temperature > 35 && (
        <div className="mt-4 p-2 bg-orange-50 rounded-lg dark:bg-orange-900/20">
          <p className="text-xs text-orange-700 dark:text-orange-300 flex items-center gap-1">
            <Thermometer className="h-3 w-3" />
            Extreme heat - Ensure adequate irrigation and worker hydration
          </p>
        </div>
      )}
    </div>
  );
};