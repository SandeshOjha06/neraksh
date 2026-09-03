/**
 * Formats the AI Hazard Analysis into the current active language using
 * structured prediction features and translation keys.
 */
export function getLocalizedHazardReasoning(predictionResult, t, getSeverityLabel) {
  if (!predictionResult) return '';

  const severity = predictionResult.severity_level || 'Low';
  const localizedSeverity = getSeverityLabel(severity) || severity;
  const lat = predictionResult.latitude ? Number(predictionResult.latitude).toFixed(4) : '0.0000';
  const lon = predictionResult.longitude ? Number(predictionResult.longitude).toFixed(4) : '0.0000';
  const combinedScore = (predictionResult.raw_score !== undefined ? (Number(predictionResult.raw_score) * 100).toFixed(1) : '0.0');

  const suscFeats = predictionResult.features?.terrain || {};
  const trigFeats = predictionResult.features?.trigger || {};

  const suscProb = predictionResult.susceptibility_score !== undefined
    ? (Number(predictionResult.susceptibility_score) * 100).toFixed(1)
    : '0.0';
  const trigProb = predictionResult.trigger_score !== undefined
    ? (Number(predictionResult.trigger_score) * 100).toFixed(1)
    : '0.0';

  const slopeDeg = suscFeats.slope_deg !== undefined ? Number(suscFeats.slope_deg).toFixed(1) : '0.0';
  const elevation = suscFeats.elevation !== undefined ? Number(suscFeats.elevation).toFixed(1) : '0.0';
  const roughness = suscFeats.roughness !== undefined ? Number(suscFeats.roughness).toFixed(1) : '0.0';
  const reliefAmplitude = suscFeats.relief_amplitude !== undefined ? Number(suscFeats.relief_amplitude).toFixed(1) : '0.0';

  const rain1d = trigFeats.rain_1d !== undefined ? Number(trigFeats.rain_1d).toFixed(1) : '0.0';
  const rain7d = trigFeats.rain_7d !== undefined ? Number(trigFeats.rain_7d).toFixed(1) : '0.0';
  const ndvi = trigFeats.ndvi !== undefined ? Number(trigFeats.ndvi) : 0.5;

  // Build drivers list
  const drivers = [];
  if (parseFloat(slopeDeg) > 25.0) {
    drivers.push(t('hazard.driver_slope', { deg: slopeDeg }));
  }
  if (parseFloat(rain7d) > 50.0 || parseFloat(rain1d) > 20.0) {
    drivers.push(t('hazard.driver_rainfall', { rain: rain7d }));
  }
  if (parseFloat(reliefAmplitude) > 100.0) {
    drivers.push(t('hazard.driver_relief', { relief: reliefAmplitude }));
  }
  if (ndvi < 0.4) {
    drivers.push(t('hazard.driver_vegetation'));
  }
  const driverStr = drivers.length > 0 ? drivers.join(', ') : t('hazard.driver_default');

  const title = t('hazard.analysis_title', { severity: localizedSeverity });
  const primaryDriversHeading = t('hazard.primary_drivers_heading');
  const assessedIntro = t('hazard.assessed_intro', {
    severity: localizedSeverity,
    score: combinedScore,
    lat,
    lon,
    drivers: driverStr
  });

  const featureBreakdownHeading = t('hazard.feature_breakdown_heading');
  const terrainLine = t('hazard.terrain_susc_line', {
    score: suscProb,
    slope: slopeDeg,
    elev: elevation,
    rough: roughness
  });
  const dynamicLine = t('hazard.dynamic_trigger_line', {
    score: trigProb,
    rain1: rain1d,
    rain7: rain7d
  });

  const guidanceHeading = t('hazard.prescriptive_guidance_heading');
  const isHighOrCritical = ['High', 'Critical'].includes(severity);
  const guidance1 = isHighOrCritical ? t('hazard.guidance_critical_1') : t('hazard.guidance_standard_1');
  const guidance2 = isHighOrCritical ? t('hazard.guidance_critical_2') : t('hazard.guidance_standard_2');
  const guidance3 = isHighOrCritical ? t('hazard.guidance_critical_3') : t('hazard.guidance_standard_3');

  return `**${primaryDriversHeading}:**
${assessedIntro}

**${featureBreakdownHeading}:**
${terrainLine}
${dynamicLine}

**${guidanceHeading}:**
${guidance1}
${guidance2}
${guidance3}`;
}
