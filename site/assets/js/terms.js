// Copyright (c) 2024-2026 OpenConstruction Open Science Initiative
// SPDX-License-Identifier: Apache-2.0

(function(){
  const ACRONYM_PATTERN = /^(2d|3d|4d|rgb|rgbd|rgb-d|slam|lidar|cnn|rnn|gan|svm|ml|ai|nlp|uav|imu|sar|bim|ifc|gpr|teaser|vlm|llm|qa|hvac|lod2|lod3|lod4|ui|pcd|fob|cif|dap)$/i;
  const MINOR_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'vs', 'with']);

  const PREFERRED_TERMS = {
    'object detection': 'Object Detection',
    'semantic segmentation': 'Semantic Segmentation',
    'object segmentation': 'Object Segmentation',
    'image classification': 'Image Classification',
    'image captioning': 'Image Captioning',
    'action recognition': 'Action Recognition',
    'crew activity recognition': 'Crew Activity Recognition',
    'simultaneous localization and mapping': 'Simultaneous Localization and Mapping',
    'pose estimation': 'Pose Estimation',
    'object tracking': 'Object Tracking',
    'point cloud segmentation': 'Point Cloud Segmentation',
    'point cloud generation': 'Point Cloud Generation',
    'point cloud visualization': 'Point Cloud Visualization',
    '3d reconstruction': '3D Reconstruction',
    '3d registration': '3D Registration',
    '3d rendering': '3D Rendering',
    'image to image translation': 'Image-to-Image Translation',
    'image synthesis': 'Image Synthesis',
    'knowledge reasoning': 'Knowledge Reasoning',
    'knowledge graph construction': 'Knowledge Graph Construction',
    'information retrieval': 'Information Retrieval',
    'question answering': 'Question Answering',
    'visual question answering': 'Visual Question Answering',
    'video qa': 'Video QA',
    'vision language reasoning': 'Vision-Language Reasoning',
    'scan to bim': 'Scan-to-BIM',
    'text to bim': 'Text-to-BIM',
    'floorplan to bim': 'Floorplan-to-BIM',
    '2d to bim reconstruction': '2D-to-BIM Reconstruction',
    'bim object classification': 'BIM Object Classification',
    'bim alignment': 'BIM Alignment',
    'semantic bim change detection': 'Semantic BIM Change Detection',
    'cad generation': 'CAD Generation',
    'model context protocol': 'Model Context Protocol',
    'building localization': 'Building Localization',
    'damage classification': 'Damage Classification',
    'sewer defect classification': 'Sewer Defect Classification',
    'safety monitoring': 'Safety Monitoring',
    'site understanding': 'Site Understanding',
    'structural condition monitoring': 'Structural Condition Monitoring',
    'site mapping and navigation': 'Site Mapping and Navigation',
    'automated structural design': 'Automated Structural Design',
    'conceptual design': 'Conceptual Design',
    'compliance checking': 'Compliance Checking',
    'quality control': 'Quality Control',
    'shear wall layout generation': 'Shear Wall Layout Generation',
    'plan recognition': 'Plan Recognition',
    'as built bim generation': 'As-Built BIM Generation',
    'as built bim': 'As-Built BIM',
    'ergonomic assessment': 'Ergonomic Assessment',
    'productivity monitoring': 'Productivity Monitoring',
    'floorplan generation': 'Floorplan Generation',
    'building energy analysis': 'Building Energy Analysis',
    '3d building mesh generation': '3D Building Mesh Generation',
    'design brief automation': 'Design Brief Automation',
    'historic digital survey': 'Historic Digital Survey',
    'progress monitoring': 'Progress Monitoring',
    'knowledge management': 'Knowledge Management',
    'change detection': 'Change Detection',
    'lod3 building model generation': 'LOD3 Building Model Generation',
    'digital twin enrichment': 'Digital Twin Enrichment',
    'digital twin generation': 'Digital Twin Generation',
    'computer aided design': 'Computer-Aided Design',
    'video based ui understanding': 'Video-Based UI Understanding',
    'work package generation': 'Work Package Generation',
    'bim authoring assistance': 'BIM Authoring Assistance',
    'blockchain enabled bim management': 'Blockchain-Enabled BIM Management',
    'design change auditing': 'Design Change Auditing',
    'cross platform bim data exchange': 'Cross-Platform BIM Data Exchange',
    'asset management': 'Asset Management',
    'post disaster damage assessment': 'Post-Disaster Damage Assessment',
    'post disaster assessment': 'Post-Disaster Assessment',
    'building performance simulation': 'Building Performance Simulation',
    'energy modelling': 'Energy Modelling',
    'hvac model generation': 'HVAC Model Generation',
    'life cycle assessment': 'Life Cycle Assessment',
    'structural defect detection': 'Structural Defect Detection',
    'pipeline leakage detection': 'Pipeline Leakage Detection',
    'subsurface infrastructure monitoring': 'Subsurface Infrastructure Monitoring'
  };

  function normalizeKey(value){
    if (value == null) return '';
    return String(value)
      .normalize('NFKC')
      .trim()
      .replace(/[‐-‒–—―]/g, '-')
      .replace(/[’']/g, '')
      .replace(/&/g, ' and ')
      .replace(/[_./-]+/g, ' ')
      .replace(/[^a-zA-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function splitList(value){
    if (value == null || value === '') return [];
    const raw = Array.isArray(value) ? value : String(value).split(/[,/|+]/g);
    return raw.map(item => String(item || '').trim()).filter(Boolean);
  }

  function splitModalityList(value){
    if (value == null || value === '') return [];
    const raw = Array.isArray(value) ? value : String(value).split(/[,/|+]| and /gi);
    return raw.map(item => String(item || '').trim()).filter(Boolean);
  }

  function titleizeTerm(raw){
    const key = normalizeKey(raw);
    if (!key) return '';
    return key.split(/\s+/).map((token, index) => {
      if (ACRONYM_PATTERN.test(token)) return token.toUpperCase();
      if (index > 0 && MINOR_WORDS.has(token)) return token;
      return `${token.charAt(0).toUpperCase()}${token.slice(1)}`;
    }).join(' ');
  }

  function preferredTaskLabel(raw){
    const key = normalizeKey(raw);
    if (!key) return '';
    const aliasMap = window.OC_TASK_VOCAB?.aliasToPreferred;
    return aliasMap?.get(key) || PREFERRED_TERMS[key] || '';
  }

  function prettyTermLabel(raw){
    return preferredTaskLabel(raw) || titleizeTerm(raw);
  }

  function uniquePrettyTerms(value){
    const seen = new Set();
    const output = [];
    splitList(value).forEach(item => {
      const label = prettyTermLabel(item);
      const key = normalizeKey(label);
      if (!key || seen.has(key)) return;
      seen.add(key);
      output.push(label);
    });
    return output;
  }

  function canonicalizeModalityLabel(raw){
    if (!raw) return 'Other';
    const s = normalizeKey(raw);
    const has = re => re.test(s);
    const hasSynthetic = has(/\bsynthetic\b|simulat(?:e|ed|ion)|render(?:ed|ing)?|\bcg\b|\bcgi\b|computer generated|virtual|digital twin|sim to real|sim2real|unreal|unity|blender|gazebo|airsim|carla|\bgta\b/);
    const hasText = has(/\btext\b|\blanguage\b|\bprompt\b|\bdocument(?:s)?\b|\binstruction(?:s)?\b|\bpdf\b|\bcode\b|\bnlp\b|\btextual\b/);
    const hasLidar = has(/\blidar\b|li dar|\bvelodyne\b|\brplidar\b/);
    const hasPC = has(/point cloud/);
    const hasDepth = has(/\bdepth\b|\brgb d\b|\brgbd\b|\bstereo\b|\bkinect\b/);
    const hasThermal = has(/\bthermal\b|\binfrared\b|\bir\b/);
    const hasGPR = has(/\bgpr\b|ground penetrating radar|radargram|\bb scan\b|\bc scan\b/);
    const hasSAR = has(/\bsar\b|\bradar\b/);
    const hasMulti = has(/\bmultispectral\b/);
    const hasHyper = has(/\bhyperspectral\b/);
    const hasVideo = has(/\bvideo\b|\bsequence\b|\bstream\b/);
    const hasSat = has(/\bsatellite\b|\blandsat\b|\bsentinel\b/);
    const hasAerial = has(/\baerial\b|\bdrone\b|\buav\b|\bauv\b/);
    const hasEgocentric = has(/\begocentric\b|\bego\b|\bfirst person\b|\bwearable\b|\bbodycam\b|\bheadcam\b|\bhelmet camera\b/);
    const hasGround = has(/\bground\b|\bhandheld\b|\bphone\b|\bmobile\b|\bvehicle\b|\brover\b/);
    const hasRGB = has(/\brgb\b|\bimage\b|\bphoto\b/);
    const hasBIM = has(/\bifc\b|\bbim\b|building information model(?:ing)?|revit|rvt|navisworks|nwd|nwc|nwf|archicad|openbim|gbxml|open bim/);
    const hasDrawingCAD = has(/\bcad\b|\bautocad\b|\bdwg\b|\bdxf\b|blueprint|floor plan|plan view|construction drawing|technical drawing|shop drawing|as built|\belevation\b|\bsection\b/);
    const hasLogs = has(/\blog\b|\blogs\b|event log|change log|audit trail|version history|ledger/);
    const hasIMU = has(/\bimu\b|inertial measurement unit|accelerometer|gyroscope|magnetometer/);
    const hasGeospatial = has(/\bgeospatial\b|\bgis\b|shapefile|geojson|geodatabase|geopackage|orthomosaic|orthophoto|\bdem\b|\bdsm\b|\bdtm\b|georeferenc(?:e|ed)|topograph(?:y|ic)|cartograph(?:y|ic)/);
    const hasTabular = has(/\btabular\b|\btable\b|\bspreadsheet\b|\bcsv\b|\bxls\b|\bxlsx\b|\bparquet\b|\btsv\b|\brelational\b|\bdatabase\b|\bsql\b/);
    const hasBuildingModel = has(/\bbuilding model\b|\bbuilding models\b/);
    const hasLod2 = has(/\blod 2\b|\blod2\b/);

    if (hasAerial && hasLidar && hasPC) return 'Aerial LiDAR Point Clouds';
    if (hasLod2 && hasBuildingModel) return 'LoD2 Building Models';
    if (hasLidar) return 'LiDAR';
    if (hasGPR) return 'GPR Radargram';
    if (hasIMU) return 'IMU';
    if (hasDepth) return 'RGB-D';
    if (hasThermal) return 'Thermal';
    if (hasSAR) return 'SAR';
    if (hasMulti) return 'Multispectral';
    if (hasHyper) return 'Hyperspectral';
    if (hasPC) return '3D Point Cloud';
    if (hasVideo) return 'Video Clips';
    if (hasSat) return hasRGB ? 'Satellite RGB' : 'Satellite';
    if (hasAerial) return hasRGB ? 'Aerial RGB' : 'Aerial';
    if (hasEgocentric) return hasRGB ? 'Egocentric RGB' : 'Egocentric';
    if (hasGround) return hasRGB ? 'Ground RGB' : 'Ground';
    if (hasBIM) return 'BIM/IFC';
    if (hasDrawingCAD) return 'Raster CAD';
    if (hasLogs) return 'Logs';
    if (hasSynthetic) return 'Synthetic';
    if (hasTabular) return 'Tabular';
    if (hasText) return 'Text';
    if (hasGeospatial) return 'Geospatial Data';
    return 'Other';
  }

  function canonicalizeModalityLabels(raw){
    const parts = splitModalityList(raw);
    const source = Array.isArray(raw) ? raw.join(' ') : String(raw || '');
    const labels = new Set((parts.length ? parts : [source]).map(canonicalizeModalityLabel));
    if (/\bsynthetic\b|simulat(?:e|ed|ion)|render(?:ed|ing)?|\bcg\b|\bcgi\b|computer[ -]?generated|virtual|digital\s*twin|sim[-\s]?to[-\s]?real|sim2real|unreal|unity|blender|gazebo|airsim|carla|\bgta\b/i.test(source)) {
      labels.add('Synthetic');
    }
    if (labels.size > 1 && labels.has('Other')) labels.delete('Other');
    return Array.from(labels);
  }

  window.OCTerms = {
    key: normalizeKey,
    normalizeTaskKey: normalizeKey,
    splitList,
    prettyTermLabel,
    preferredTaskLabel,
    uniquePrettyTerms,
    canonicalizeModalityLabel,
    canonicalizeModalityLabels
  };

  window.normalizeOcTaskKey = normalizeKey;
})();
