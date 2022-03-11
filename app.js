var ftcPA = ee.FeatureCollection('users/projectgeffao/Ecuador/ProtectedAreas_SNAP_Ecuador'),
    ftc0 = ee.FeatureCollection("users/projectgeffao/Ecuador/ECU_Precal_Level0_v3"),
    ftc1 = ee.FeatureCollection("users/projectgeffao/Ecuador/ECU_Precal_Level1_v3"),
    ftc2 = ee.FeatureCollection("users/projectgeffao/Ecuador/ECU_Precal_Level2_v3"),
    ftcQM = ee.FeatureCollection("users/projectgeffao/Ecuador/ECU_Precal_Level_QM_v3"),
    ftcLUS = ee.FeatureCollection("users/projectgeffao/Ecuador/ECU_Precal_Level_LUS_v3"),
    ftcBasins3 = ee.FeatureCollection("users/projectgeffao/Ecuador/ECU_Precal_Basins3_v3"),
    ftcBasins4 = ee.FeatureCollection("users/projectgeffao/Ecuador/ECU_Precal_Basins4_v3"),
    ftcKBA = ee.FeatureCollection("users/projectgeffao/World/KBAsGlobal_2020_September_02_POL_Fixed"),
    imgFireIndex = ee.Image("users/projectgeffao/World/FireRecurrenceIndex_MCD64_2001_2020_World"),
    imgPrecipitationTrend = ee.Image("users/projectgeffao/World/Climate/aPrecipTrendIndex_GpmTerraEra5_World_2000_2020"),
    imgTerrain = ee.Image("users/cesarnon/World/Terrain_rgb3b_Ecuador"),
    imgHiHAPoverty = ee.Image("users/projectgeffao/Ecuador/HiH_Agricola_Apoverty"),
    imgHiHAEfficiency = ee.Image("users/projectgeffao/Ecuador/HiH_Agricola_Efficiency"),
    imgHiHAPotential = ee.Image("users/projectgeffao/Ecuador/HiH_Agricola_Potential"),
    imgQMExtent = ee.Image("users/projectgeffao/Ecuador/QM_Extension"),
    imgQMMappingUnits = ee.Image("users/projectgeffao/Ecuador/QM_MapUnit"),
    imgLUS = ee.Image("users/projectgeffao/Ecuador/LUS_MapUnit"),
    imgQMRecommendations = ee.Image('users/projectgeffao/Ecuador/QM_Recomenda'),
    imgQMDegree = ee.Image('users/projectgeffao/Ecuador/QM_Grado'),
    imgQMDirectCauses = ee.Image('users/projectgeffao/Ecuador/QM_CausasDirectas'),
    imgQMDegradationType = ee.Image('users/projectgeffao/Ecuador/QM_TipoDegradacion'),
    imgQMEcosysServicesImpact = ee.Image('users/projectgeffao/Ecuador/QM_ImpactoSE'),
    imgBiogeoSectors = ee.Image('users/projectgeffao/Ecuador/SectorBiogeografico_img'),
    imgKBABin = ee.Image('users/projectgeffao/Ecuador/KBA_Ecuador'),
    imgPABin = ee.Image('users/projectgeffao/Ecuador/ProtectedAreas_SNAP_Ecuador_img'),
    imgSoc6Cat = ee.Image('users/projectgeffao/Ecuador/MA002_CARBONO_ORGANICO_SUELOS_v2_6cat'),
    ftcADM0 = ee.FeatureCollection('users/projectgeffao/Ecuador/Ecuador_ADM0'),
    ftcSLM = ee.FeatureCollection("users/wocatapps/Ecuador/SLM_Ecuador_v1"),
    ftcBioGeo = ee.FeatureCollection("users/projectgeffao/Ecuador/ECU_Precal_Biogeografia_v4");


/**
 * App: LDN Ecuador
 *
 * The structure of this script tries to follow UI Pattern Template script provided by 
 * Tyler Erickson and Justin Braaten at
 * https://code.earthengine.google.com/bab500e5290d579f8d5f1cc5715314cf
 *   
 * 1-Model, 2-Components, 3-Composition, 4-Styling, 5-Behaviors, 6-Initialization
 * 
 * @author Eugenia Raviolo (eugenia.raviolo@gmail.com)
 * @author Cesar Garcia (cesarnon@gmail.com)
 * @author Ingrid Teich (ingridteich@gmail.com)
 */


/** Modules */
var mdlLegends = require('users/wocatapps/Ecuador:legends.js');
var mdlPrecalculation = require('users/wocatapps/Ecuador:precalculation.js');
var mdlLocalization = require('users/wocatapps/Ecuador:localization.js');


/** Assets */
var a = {};
// Assets from precalculation script
a.imgMountains = mdlPrecalculation.imgMountains.clip(ftcADM0);
a.imgLPD = mdlPrecalculation.imgLPD.unmask().clip(ftcADM0);
a.imgSOC = mdlPrecalculation.imgSOC.unmask().clip(ftcADM0);
a.imgCombinedx2 = mdlPrecalculation.baseLCSource.imgCombinedx2.clip(ftc0); // LCxLPD
a.imgLastLC = mdlPrecalculation.baseLCSource.imgLcAll.select('y' + mdlPrecalculation.baseLCSource.lastYear).clip(ftcADM0);


// From local imports
a.imgFireIndex = imgFireIndex.updateMask(1).clip(ftcADM0);

// For multicriteria calculation
a.imgCustom = ee.Image(0).selfMask();
a.imgKBABin = imgKBABin.clip(ftcADM0);
a.imgPABin = imgPABin.clip(ftcADM0);
a.imgSoc6Cat = imgSoc6Cat.clip(ftcADM0);


// Filter global assets
a.ftcKBA = ftcKBA.filter(ee.Filter.eq('ISO3', 'ECU'));

var paletteSLMList = ee.List(['#db9003', '#08964f', '#49d7e1']);
var namesSLMList = ee.List(['Approach', 'Technology', 'UNCCD PRAIS']);
a.ftcSLMStyled = ftcSLM.map(function (f) {
    return f.set({ style: { color: paletteSLMList.get(namesSLMList.indexOf(f.get("Type"))), pointSize: 5 } });
});

// NDVI by month and year
var startYear = 2001;
var endYear = 2020;
var imcModis = ee.ImageCollection('MODIS/006/MOD13Q1').filterDate(startYear + '-01-01', endYear + '-12-31');
var imcModisNDVI = imcModis.select('NDVI');
var lstYears = ee.List.sequence(startYear, endYear);
var lstMonths = ee.List.sequence(1, 12);
// 20x12=240 images
var imcNDVIByMonthYear = ee.ImageCollection.fromImages(
    lstYears.map(function (y) {
        return lstMonths.map(function (m) {
            return imcModisNDVI
                .filter(ee.Filter.calendarRange(y, y, 'year'))
                .filter(ee.Filter.calendarRange(m, m, 'month'))
                .mean()
                .set('system:time_start', ee.Date.fromYMD(y, m, 1));

        });
    }).flatten());

initApp(mdlLocalization.languages[1]);

function initApp(lan) {

    /*******************************************************************************
    * 1-Model *
    ******************************************************************************/

    // JSON object for storing the data model.
    var m = {};
    m.labels = mdlLocalization.getLocLabels(lan);
    m.evalSet = {};
    m.maxAreaHa = 1000000;
    m.gmySelected = undefined;
    m.selectedLayerName = '';

    // Options: NATIONAL LC
    m.transitionsSources = mdlPrecalculation.sources;

    // Selected transition source 
    m.selectedSource = m.transitionsSources[0];
    m.defaultFinalLCYear = mdlPrecalculation.baseLCSource.lastYear;
    m.defaultInitialLCYear = mdlPrecalculation.baseLCSource.initialYears[0];

    // More info & contact
    m.info = {
        referenceDocUrl: '',
        contactEmail1: 'pablo.caza@ambiente.gob.ec',
        contactEmail2: 'nicole.harari@unibe.ch',
        contactEmail3: 'cesar.garcia@fao.org',
        citation: 'Teich et al. 2022.  Land Degradation & Development (in review)',
        logoAssetId: 'users/projectgeffao/Ecuador/Logo_ecuador',
        logoDimensions: '553x218',
    }


    // Feature collections options to click on the map to obtain precalculated statistics
    m.assetsClick = {};
    m.assetsClick[m.labels.lblNone] = null;
    m.assetsClick[m.labels.lblLevel1] = ftc1;
    m.assetsClick[m.labels.lblLevel2] = ftc2;
    m.assetsClick[m.labels.lblLUS] = ftcLUS;
    m.assetsClick[m.labels.lblQM] = ftcQM;
    m.assetsClick[m.labels.lblBasins] = ftcBasins3;
    m.assetsClick[m.labels.lblSubbasins] = ftcBasins4;
    m.assetsClick[m.labels.lblSLM] = ftcSLM; // buffered on click
    m.assetsClick[m.labels.lblBioGeoSector] = ftcBioGeo;


    // Feature collection to query on map click
    m.ftcClickOn = null;

    // Layers Visualization
    m.lv = {
        lc: {
            vis: {
                min: 1, max: 8, opacity: 1,
                palette: ['#377e3f', '#5cd369', '#c19511', '#ef71ff', '#fcdb00', '#d7191c', '#cfdad2', '#4458eb'],
            },
            names: [
                m.labels.lblTreeCovered,
                m.labels.lblForests,
                m.labels.lblGrassland,
                m.labels.lblParamo,
                m.labels.lblCropland,
                m.labels.lblArtificial,
                m.labels.lblOtherLand,
                m.labels.lblWaterbody,
            ]
        },
        lpd: {
            vis: {
                min: 0, max: 5, opacity: 1,
                palette: ['#ffffff', '#f23c46', '#e9a358', '#e5e6b3', '#a9afae', '#267300'],
            },
            names: [
                m.labels.lblNonVegetatedArea,
                m.labels.lblDeclining,
                m.labels.lblEarlySignDecline,
                m.labels.lblStableButStressed,
                m.labels.lblStable,
                m.labels.lblIncreasing,
            ]
        },
        mountains: {
            vis: {
                min: 1, max: 7, opacity: 1,
                palette: ['#c5fff8', '#95dbd3', '#92db9c', '#55c364', '#8b9c15', '#d99c22', '#9e7219'],
            },
            names: [
                m.labels.lblMountain1,
                m.labels.lblMountain2,
                m.labels.lblMountain3,
                m.labels.lblMountain4,
                m.labels.lblMountain5,
                m.labels.lblMountain6,
                m.labels.lblMountain7,
            ]
        },
        lcTransitions: {
            vis: {
                max: 8, min: 0, opacity: 1,
                palette: ['#FEFFE5', '#377e3f', '#5cd369', '#c19511', '#ef71ff', '#fcdb00', '#d7191c', '#cfdad2', '#4458eb'],
            },
            names: [
                m.labels.lblNoChange,
                m.labels.lblTreeCovered,
                m.labels.lblForests,
                m.labels.lblGrassland,
                m.labels.lblParamo,
                m.labels.lblCropland,
                m.labels.lblArtificial,
                m.labels.lblOtherLand,
                m.labels.lblWaterbody,
            ]
        },
        borderLevel1: { vis: { color: 'black', fillColor: '00000000' } },
        borderLevel2: { vis: { color: '#838888', fillColor: '00000000', width: 1 } },
        borderBasins: { vis: { color: 'blue', fillColor: '00000000', width: 1 } },
        borderSubbasins: { vis: { color: 'green', fillColor: '00000000', width: 1 } },
        borderLevelQM: { vis: { color: '#DF8F05', fillColor: '00000000', width: 1 } },
        borderLevelLUS: { vis: { color: 'yellow', fillColor: '00000000', width: 1 } },
        highlight: { vis: { color: '#b040d6', fillColor: '00000000' } },
        soc: { vis: { min: 0, max: 150, palette: ['#fcffac', '#a60000'] } },
        custom: { vis: { max: 1, min: 1, opacity: 1, palette: ['#FF00FF'] } },
        terrain: { vis: { min: 0, max: 5000, palette: ['#87e2ffff', '#80d5e3ff', '#73c2bcff', '#66af95ff', '#589c6eff', '#4b8947ff', '#3e7620ff', '#33720cff', '#33c05aff', '#8bdb82ff', '#c4e297ff', '#d5e0a1ff', '#e7deabff', '#f8dcb5ff', '#fddab4ff', '#fcd7adff', '#fad4a5ff', '#f8d29eff', '#f6cf97ff', '#f4cc8fff', '#f2c988ff', '#f0c780ff', '#eec479ff', '#ecc171ff', '#eabe6aff', '#e8bc62ff', '#e6b95bff', '#e4b653ff', '#e2b34cff', '#e0b144ff', '#deae3dff', '#dcab35ff', '#daa82eff', '#d9a627ff', '#d1a425ff', '#caa224ff', '#c2a023ff', '#bb9e22ff', '#b39c20ff', '#ac9a1fff', '#a7991eff', '#a7971dff', '#a6961cff', '#a5941bff', '#a5931aff', '#a49119ff', '#a49019ff', '#a38e18ff', '#a38d17ff', '#a38b16ff', '#a28a15ff', '#a28814ff', '#a28613ff', '#a18512ff', '#a18311ff', '#a08110ff', '#a0800fff', '#9f7e0eff', '#9f7c0eff', '#9f7b0dff', '#9e790cff', '#9e780bff', '#9d760aff', '#9d7509ff', '#9c7308ff', '#9c7207ff', '#9b7006ff', '#9b6e05ff', '#9a6d04ff', '#9a6b03ff', '#9a6902ff', '#996801ff', '#996600ff', '#9a640aff', '#9b6218ff', '#9c6025ff', '#9e5e33ff', '#9f5c40ff', '#a05a4eff', '#a25a5aff', '#a55e5eff', '#a76262ff', '#a96767ff', '#ac6b6bff', '#ae7070ff', '#b17474ff', '#b27979ff', '#b37d7dff', '#b48181ff', '#b48686ff', '#b58a8aff', '#b68f8fff', '#b79393ff', '#b89898ff', '#ba9c9cff', '#bca0a0ff', '#bda5a5ff', '#bfa9a9ff', '#c1aeaeff', '#c2b2b2ff', '#c4b6b6ff', '#c6bbbbff', '#c7bfbfff', '#c9c3c3ff', '#cac8c8ff', '#ccccccff', '#d0d0d0ff', '#d3d3d3ff', '#d7d7d7ff', '#dbdbdbff', '#dfdfdfff', '#e3e3e3ff', '#e7e7e7ff', '#ebebebff', '#efefefff', '#f3f3f3ff', '#f7f7f7ff', '#fbfbfbff'] } },
        pa: { vis: { color: 'green', width: 1 } },
        kba: { vis: { color: 'orange' } },
        fireIndex: { vis: { opacity: 1, min: 0, max: 0.5, palette: ['#fcfdbf', '#fc8761', '#b63679', '#50127b', '#000004'] } },
        precipTrend: { vis: { min: -3, max: 3, opacity: 1, palette: ["#d63000", "#ffffff", "#062fd6"] } },
        lmh: {
            vis: { min: 0, max: 3, opacity: 1, palette: ['#ffffff', '#ec0101', '#e9ff69', '#0cb100'] },
            names: [
                m.labels.lblNoData,
                m.labels.lblLow,
                m.labels.lblMedium,
                m.labels.lblHigh,
            ]
        },
        lmhPovertry: {
            vis: { min: 0, max: 3, opacity: 1, palette: ['#ffffff', '#0cb100', '#e9ff69', '#ec0101'] },
            names: [
                m.labels.lblNoData,
                m.labels.lblLow,
                m.labels.lblMedium,
                m.labels.lblHigh,
            ]
        },
        extent: {
            vis: { min: 0, max: 100, palette: ['#ffffff', '#fa9191', '#fa534c', '#b32800'] },

        },
        recommendations: {
            vis: { min: 0, max: 4, palette: ['#ffffff', '#6d966b', '#7faed5', '#ef492f', '#eb97d3'] },
            names: [
                m.labels.lblNoData,
                m.labels.lblPrevention,
                m.labels.lblMitigation,
                m.labels.lblRehabilitation,
                m.labels.lblAdaptation,
            ]
        },
        degradationTypes: {
            vis: { min: 1, max: 6, palette: ['#5C8944', '#0170FE', '#E7E600', '#CA7AF5', '#FE0000', '#002573'] },
            names: [
                m.labels.lblBioDeg,
                m.labels.lblWaterDeg,
                m.labels.lblPhysycalDet,
                m.labels.lblChemicalDet,
                m.labels.lblEolicErosion,
                m.labels.lblWaterErosion,
            ]
        },
        degree: {
            vis: { min: 0, max: 4, palette: ['#ffffff', '#f8dbeb', '#da9acb', '#de348a', '#980043'] },
            names: [
                m.labels.lblNoData,
                m.labels.lblLight,
                m.labels.lblModerate,
                m.labels.lblStrong,
                m.labels.lblExtreme,
            ]
        },
        directCauses: {
            vis: { min: 0, max: 10, palette: ['#ffffff', '#9c9c9c', '#5176c1', '#a035be', '#327644', '#de282e', '#0f187e', '#dcbc04', '#e8e0a2', '#874e3c', '#e46723'] },
            names: [
                m.labels.lblNoData,
                m.labels.lblIndustrial,
                m.labels.lblHydrologicalCycle,
                m.labels.lblNaturalCauses,
                m.labels.lblVegetationRemoval,
                m.labels.lblUrbanDevelopment,
                m.labels.lblContaminatingDischarges,
                m.labels.lblCropManagement,
                m.labels.lblSoilManagement,
                m.labels.lblOverExploitation,
                m.labels.lblOvergrazing,
            ]
        },
        ecosysServicesImpact: {
            vis: { min: 1, max: 6, palette: ['#3A9040', '#33F9C2', '#D2EC97', '#9B0B91', '#E0812E', '#9187EC'] },
            names: [
                m.labels.lblBiodiversityServices,
                m.labels.lblSoilServices,
                m.labels.lblWaterServices,
                m.labels.lblProtectionServices,
                m.labels.lblProductiveServices,
                m.labels.lblSocioCulturalServices,
            ]
        },
        biogeoSectors: {
            vis: { min: 1, max: 15, palette: ['#9c9c9c', '#5176c1', '#eb97d3', '#327644', '#3A9040', '#33F9C2', '#D2EC97', '#9B0B91', '#E0812E', '#de282e', '#0f187e', '#dcbc04', '#e8e0a2', '#874e3c', '#e9ff69'] },
            names: [
                m.labels.lblBioGeoSector1,
                m.labels.lblBioGeoSector2,
                m.labels.lblBioGeoSector3,
                m.labels.lblBioGeoSector4,
                m.labels.lblBioGeoSector5,
                m.labels.lblBioGeoSector6,
                m.labels.lblBioGeoSector7,
                m.labels.lblBioGeoSector8,
                m.labels.lblBioGeoSector9,
                m.labels.lblBioGeoSector10,
                m.labels.lblBioGeoSector11,
                m.labels.lblBioGeoSector12,
                m.labels.lblBioGeoSector13,
                m.labels.lblBioGeoSector14,
                m.labels.lblBioGeoSector15,
            ]
        },
        slm: {
            vis: {
                palette: ['#08964f', '#49d7e1'],// '#db9003',
            },
            names: [
                //m.labels.lblApproach,
                m.labels.lblTechnology,
                m.labels.lblUNCCDPrais,
            ]
        },
    };

    // Map layers configuration
    m.layerEntries = [
        {
            asset: imgQMMappingUnits.randomVisualizer(),
            style: {},
            name: m.labels.lblQM,
            visible: false,
            legend: null,
            group: 'RASTER',
            citation: ''
        },
        {
            asset: imgLUS.randomVisualizer(),
            style: {},
            name: m.labels.lblLUS,
            visible: false,
            legend: null,
            group: 'RASTER',
            citation: ''
        },
        {
            asset: imgHiHAPoverty,
            style: m.lv.lmhPovertry.vis,
            name: m.labels.lblRuralPoverty,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblRuralPoverty, m.lv.lmhPovertry.names, m.lv.lmhPovertry.vis.palette, false, false),
            group: 'RASTER',
            citation: 'https://drive.google.com/file/d/1nlDhrYtNCxSi9OT31bCmiPZm4xxo-xJ9/view?usp=sharing'

        },
        {
            asset: imgHiHAPotential,
            style: m.lv.lmh.vis,
            name: m.labels.lblAgriculturalPotential,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblAgriculturalPotential, m.lv.lmh.names, m.lv.lmh.vis.palette, false, false),
            group: 'RASTER',
            citation: 'https://drive.google.com/file/d/1nXoQasNF0qgzrlcBUePb7TAYnssfKnzk/view?usp=sharing'

        },
        {
            asset: imgHiHAEfficiency,
            style: m.lv.lmh.vis,
            name: m.labels.lblTechnicalEfficiency,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblTechnicalEfficiency, m.lv.lmh.names, m.lv.lmh.vis.palette, false, false),
            group: 'RASTER',
            citation: 'https://drive.google.com/file/d/1lLXX9T1SKcV0haDSypz8qifVTWjySbUK/view?usp=sharing'

        },
        {
            asset: imgQMExtent,
            style: m.lv.extent.vis,
            name: m.labels.lblQMExtent,
            visible: false,
            legend: mdlLegends.createColorRampLegendPanel(m.labels.lblQMExtentperc, m.lv.extent.vis),
            group: 'RASTER',
            citation: 'https://www.wocat.net/en/projects-and-countries/projects/ds-slm/countries/ecuador#module-2'
            

        },
        {
            asset: imgQMDegradationType,
            style: m.lv.degradationTypes.vis,
            name: m.labels.lblQMDegradationTypes,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblQMDegradationTypes, m.lv.degradationTypes.names, m.lv.degradationTypes.vis.palette, false, false),
            group: 'RASTER',

        },
        {
            asset: imgQMDegree,
            style: m.lv.degree.vis,
            name: m.labels.lblQMDegree,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblQMDegree, m.lv.degree.names, m.lv.degree.vis.palette, false, false),
            group: 'RASTER',
            citation: 'https://www.wocat.net/en/projects-and-countries/projects/ds-slm/countries/ecuador#module-2'

        },
        {
            asset: imgQMDirectCauses,
            style: m.lv.directCauses.vis,
            name: m.labels.lblQMDirectCauses,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblQMDirectCauses, m.lv.directCauses.names, m.lv.directCauses.vis.palette, false, false),
            group: 'RASTER',
            citation: 'https://www.wocat.net/en/projects-and-countries/projects/ds-slm/countries/ecuador#module-2'

        },
        {
            asset: imgQMEcosysServicesImpact,
            style: m.lv.ecosysServicesImpact.vis,
            name: m.labels.lblQMImpactEcosystemServices,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblQMImpactEcosystemServices, m.lv.ecosysServicesImpact.names, m.lv.ecosysServicesImpact.vis.palette, false, false),
            group: 'RASTER',
            citation: 'https://www.wocat.net/en/projects-and-countries/projects/ds-slm/countries/ecuador#module-2'
        },
        {
            asset: imgQMRecommendations,
            style: m.lv.recommendations.vis,
            name: m.labels.lblQMRecommendations,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblQMRecommendations, m.lv.recommendations.names, m.lv.recommendations.vis.palette, false, false),
            group: 'RASTER',
            citation: 'https://www.wocat.net/en/projects-and-countries/projects/ds-slm/countries/ecuador#module-2'
        },
        {
            asset: imgBiogeoSectors,
            style: m.lv.biogeoSectors.vis,
            name: m.labels.lblBioGeoSector,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblBioGeoSector, m.lv.biogeoSectors.names, m.lv.biogeoSectors.vis.palette, false, false),
            group: 'RASTER',
        },
        {
            asset: imgTerrain,
            style: {},
            name: m.labels.lblTopography,
            visible: true,
            legend: mdlLegends.createColorRampLegendPanel(m.labels.lblElevation + ' (m)', m.lv.terrain.vis),
            group: 'RASTER',
        },
        {
            asset: a.imgLastLC,
            style: m.lv.lc.vis,
            name: m.labels.lblLandCover + ' (' + mdlPrecalculation.baseLCSource.name + ') ' + mdlPrecalculation.baseLCSource.lastYear,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblLandCover + ' (' + mdlPrecalculation.baseLCSource.name + ') ' + mdlPrecalculation.baseLCSource.lastYear, m.lv.lc.names, m.lv.lc.vis.palette, false, false),
            group: 'RASTER',
            citation: ''
        },
        {
            asset: a.imgLPD,
            style: m.lv.lpd.vis,
            name: m.labels.lblLandProductivityDynamics,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblLandProductivityDynamics, m.lv.lpd.names, m.lv.lpd.vis.palette, false, false),
            group: 'RASTER',
            citation: 'https://drive.google.com/file/d/1xm2weOnMFiItr2kAlm8BVz_MrGACy2BM/view?usp=sharing'
        },
        {
            asset: a.imgSOC,
            style: m.lv.soc.vis,
            name: m.labels.lblSocMap,
            visible: false,
            legend: mdlLegends.createColorRampLegendPanel(m.labels.lblSOCTonnesHa, m.lv.soc.vis),
            group: 'RASTER',
            citation: 'https://drive.google.com/file/d/1GVFkkk1S1FiYqKDgVd1HPvR8tYvzg4Yt/view?usp=sharing'
        },
        {
            asset: imgPrecipitationTrend,
            style: m.lv.precipTrend.vis,
            name: m.labels.lblPrecipitationTrend,
            visible: false,
            legend: mdlLegends.createColorRampLegendPanel(m.labels.lblPrecipitationTrend, m.lv.precipTrend.vis, m.labels.lblNegTrend, '', m.labels.lblPosTrend),
            group: 'RASTER',
            citation: 'https://drive.google.com/file/d/1D5jwZgr5yyF3m-NG-p6b9t8_gHifZaTN/view?usp=sharing'
        },
        {
            asset: a.imgMountains,
            style: m.lv.mountains.vis,
            name: m.labels.lblMountains,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblMountains, m.lv.mountains.names, m.lv.mountains.vis.palette, false, false),
            group: 'RASTER',
            citation: ''
        },
        {
            asset: a.imgFireIndex,
            style: m.lv.fireIndex.vis,
            name: m.labels.lblFireIndex,
            visible: false,
            legend: mdlLegends.createColorRampLegendPanel(m.labels.lblFireIndex, m.lv.fireIndex.vis, '0.05', '0.25', '0.5'),
            group: 'RASTER',
            citation: 'https://drive.google.com/file/d/13rFx7rag-u_9D2-E0or5d0uwn8dVHqAp/view?usp=sharing'
        },
        {
            asset: ftc1,
            style: m.lv.borderLevel1.vis,
            name: m.labels.lblLevel1,
            visible: false,
            legend: null,
            group: 'FEATURES',
            singleColor: 'SQUARE',
        },
        {
            asset: ftc2,
            style: m.lv.borderLevel2.vis,
            name: m.labels.lblLevel2,
            visible: false,
            legend: null,
            group: 'FEATURES',
            singleColor: 'SQUARE',
        },
        {
            asset: ftcBasins3,
            style: m.lv.borderBasins.vis,
            name: m.labels.lblBasins,
            visible: false,
            legend: null,
            group: 'FEATURES',
            singleColor: 'SQUARE',
        },
        {
            asset: ftcBasins4,
            style: m.lv.borderSubbasins.vis,
            name: m.labels.lblSubbasins,
            visible: false,
            legend: null,
            group: 'FEATURES',
            singleColor: 'SQUARE',
        },
        {
            asset: a.ftcKBA,
            style: m.lv.kba.vis,
            name: m.labels.lblKeyBiodiversityAreas,
            visible: false,
            legend: null,
            group: 'FEATURES',
            singleColor: 'SQUARE',
            citation: 'https://drive.google.com/file/d/1M55tik86J0swBc-tU8fQ_8Kx6nopL1qp/view?usp=sharing'
        },
        {
            asset: ftcPA,
            style: m.lv.pa.vis,
            name: m.labels.lblProtectedAreas,
            visible: false,
            legend: null,
            group: 'FEATURES',
            singleColor: 'SQUARE',
            citation: ''
        },
        {
            asset: a.ftcSLMStyled,
            style: { styleProperty: "style" },
            name: m.labels.lblSLM,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblSLM, m.lv.slm.names, m.lv.slm.vis.palette, false, true),
            group: 'FEATURES',
        },
    ];

    // Transitions layers configuration
    m.transitionsEntries = [
        {
            asset: m.selectedSource.imgLcAll.select('y' + m.selectedSource.yearsLC[0]).clip(ftc0),
            style: m.lv.lc.vis,
            label: m.labels.lblFromLC,
            name: m.labels.lblLandCover + ' ' + m.selectedSource.yearsLC[0],
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblLandCover, m.lv.lc.names, m.lv.lc.vis.palette, false, false),
        },
        {
            asset: m.selectedSource.imgLcAll.select('y' + m.selectedSource.lastYear).clip(ftc0),
            style: m.lv.lc.vis,
            label: m.labels.lblCurrentLC,
            name: m.labels.lblLandCover + ' ' + m.selectedSource.lastYear,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblLandCover, m.lv.lc.names, m.lv.lc.vis.palette, false, false),
        },
        {
            asset: m.selectedSource.imgTransitions.select('lc_gain_' + m.selectedSource.yearsLC[0] + '_' + m.selectedSource.lastYear).clip(ftc0),
            style: m.lv.lcTransitions.vis,
            label: m.labels.lblGains,
            name: m.labels.lblGains + ' ' + m.selectedSource.yearsLC[0] + ' - ' + m.selectedSource.lastYear,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblGains, m.lv.lcTransitions.names, m.lv.lcTransitions.vis.palette, false, false),
        },
        {
            asset: m.selectedSource.imgTransitions.select('lc_loss_' + m.selectedSource.yearsLC[0] + '_' + m.selectedSource.lastYear).clip(ftc0),
            style: m.lv.lcTransitions.vis,
            label: m.labels.lblLosses,
            name: m.labels.lblLosses + ' ' + m.selectedSource.yearsLC[0] + ' - ' + m.selectedSource.lastYear,
            visible: false,
            legend: mdlLegends.createDiscreteLegendPanel(m.labels.lblLosses, m.lv.lcTransitions.names, m.lv.lcTransitions.vis.palette, false, false),
        }];


    m.namesLayers = [];

    m.mcEntriesPrecalculated = [
        {
            title: m.labels.lblLandCover,
            palette: m.lv.lc.vis.palette,
            names: m.lv.lc.names,
            prefix: 'lc_',
            sufix: '',
            noDataCategory: false,
            image: a.imgLastLC,
            categories: [1, 2, 3, 4, 5, 6, 7, 8],
            precalName: 'lc'
        },
        {
            title: m.labels.lblLandProductivityDynamics,
            palette: m.lv.lpd.vis.palette.slice(1),
            names: m.lv.lpd.names.slice(1),
            prefix: 'lpd_',
            sufix: '',
            noDataCategory: true,
            image: a.imgLPD,
            categories: [1, 2, 3, 4, 5],
            precalName: 'lpd'
        },
    ];


    m.mcEntriesOnTheFly = [
        {
            title: m.labels.lblLandCover,
            palette: m.lv.lc.vis.palette,
            names: m.lv.lc.names,
            image: a.imgLastLC,
            categories: [1, 2, 3, 4, 5, 6, 7, 8],
        },
        {
            title: m.labels.lblLandProductivityDynamics,
            palette: m.lv.lpd.vis.palette.slice(1),
            names: m.lv.lpd.names.slice(1),
            image: a.imgLPD,
            categories: [1, 2, 3, 4, 5],
        },
        {
            title: m.labels.lblSoilOrganicCarbon,
            palette: ['#D53E4F', '#FC8D59', '#FEE08B', '#FFFFBF', '#E6F598', '#99D594',],
            names: [
                m.labels.lblSocVeryLow + ' (<20)',
                m.labels.lblSocLow + ' (20-40)',
                m.labels.lblSocModerateLow + ' (40-60)',
                m.labels.lblSocModerateHigh + ' (60-90)',
                m.labels.lblSocHigh + ' (90-1200)',
                m.labels.lblSocVeryHigh + ' (>120)',
            ],
            image: a.imgSoc6Cat,
            categories: [1, 2, 3, 4, 5, 6],
        },

        {
            title: m.labels.lblMountains,
            palette: m.lv.mountains.vis.palette,
            names: m.lv.mountains.names,
            image: a.imgMountains.unmask(),
            categories: [1, 2, 3, 4, 5, 6, 7],
        },
         {
            title: m.labels.lblKeyBiodiversityAreas,
            palette: ['grey', 'orange'],
            names: [m.labels.lblNonKba, m.labels.lblKba],
            image: a.imgKBABin,
            categories: [0, 1],
        },
        {
            title: m.labels.lblProtectedAreas,
            palette: ['grey', 'green'],
            names: [m.labels.lblNonProtectedAreas, m.labels.lblProtectedAreas],
            image: a.imgPABin,
            categories: [0, 1],
        },
        {
            title: m.labels.lblRuralPoverty,
            palette: m.lv.lmhPovertry.vis.palette.slice(1),
            names: m.lv.lmhPovertry.names.slice(1),
            image: imgHiHAPoverty,
            categories: [1, 2, 3],
        },
        {
            title: m.labels.lblAgriculturalPotential,
            palette: m.lv.lmh.vis.palette.slice(1),
            names: m.lv.lmh.names.slice(1),
            image: imgHiHAPotential,
            categories: [1, 2, 3],
        },
        {
            title: m.labels.lblTechnicalEfficiency,
            palette: m.lv.lmh.vis.palette.slice(1),
            names: m.lv.lmh.names.slice(1),
            image: imgHiHAEfficiency,
            categories: [1, 2, 3],
        },
        {
            title: m.labels.lblQMDegradationTypes,
            palette: m.lv.degradationTypes.vis.palette,
            names: m.lv.degradationTypes.names,
            image: imgQMDegradationType,
            categories: [1, 2, 3, 4, 5, 6],
        },
       {
            title: m.labels.lblQMDegree,
            palette: m.lv.degree.vis.palette.slice(1),
            names: m.lv.degree.names.slice(1),
            image: imgQMDegree,
            categories: [1, 2, 3, 4],
        },        
        {
            title: m.labels.lblQMDirectCauses,
            palette: m.lv.directCauses.vis.palette.slice(1),
            names: m.lv.directCauses.names.slice(1),
            image: imgQMDirectCauses,
            categories: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        },
        {
            title: m.labels.lblQMImpactEcosystemServices,
            palette: m.lv.ecosysServicesImpact.vis.palette,
            names: m.lv.ecosysServicesImpact.names,
            image: imgQMEcosysServicesImpact,
            categories: [1, 2, 3, 4, 5, 6],
        },
        {
            title: m.labels.lblQMRecommendations,
            palette: m.lv.recommendations.vis.palette.slice(1),
            names: m.lv.recommendations.names.slice(1),
            image: imgQMRecommendations,
            categories: [1, 2, 3, 4],
        },
 ];

    m.mcEntries = m.mcEntriesPrecalculated;

    /*******************************************************************************
    * 2-Components *
    ******************************************************************************/

    // JSON object for storing UI components.
    var c = {};
    // Root Container Panel 
    c.pnlRoot = ui.Panel({
        layout: ui.Panel.Layout.flow('horizontal'),
        style: { height: '100%', width: '100%', },
    });

    // Left panel
    c.lp = {};
    c.lp.pnlControl = ui.Panel({ style: { height: '100%', width: '20%' } });
    // Center panel
    c.cp = {};
    c.cp.pnlMap = ui.Panel({ style: { height: '100%', width: '70%' } });
    // Right panel
    c.rp = {};
    c.rp.pnlOutput = ui.Panel({ style: { height: '100%', width: '30%' } });

    // Split panel (Map & Output Panel)
    c.sppMapOutput = ui.SplitPanel(c.cp.pnlMap, c.rp.pnlOutput);


    // Left Panel - Logo & Contact section
    c.lp.info = {};
    c.lp.info.tmbLogo = ui.Thumbnail({
        image: ee.Image(m.info.logoAssetId).visualize({
            bands: ['b1', 'b2', 'b3'],
            min: 0,
            max: 255
        }),
        params: {
            dimensions: m.info.logoDimensions,
            format: 'png'
        },
    });
    c.lp.info.lblIntro = ui.Label(m.labels.lblTitle);
    c.lp.info.lblApp = ui.Label(m.labels.lblExpl1);
    c.lp.info.lblAppDev = ui.Label(m.labels.lblAppDeveloped);
    c.lp.info.lblEmail1 = ui.Label(m.info.contactEmail1).setUrl('mailto:' + m.info.contactEmail1);
    c.lp.info.lblEmail2 = ui.Label(m.info.contactEmail2).setUrl('mailto:' + m.info.contactEmail2);
    c.lp.info.lblEmail3 = ui.Label(m.info.contactEmail3).setUrl('mailto:' + m.info.contactEmail3);
    c.lp.info.lblcitation = ui.Label(m.info.citation)//.setUrl('mailto:' + m.info.contactEmail3);

    // Left Panel - Language section
    c.lp.lan = {};
    c.lp.lan.selLanguage = ui.Select({
        items: ['English', 'Spanish'],
        value: lan
    });

    // Left Panel - Administrative boundaries section
    c.lp.levels = {};
    c.lp.levels.lblChoose = ui.Label(m.labels.lblExpl2 + ' (*)');
    c.lp.levels.selLevel1 = ui.Select({
        items: [],
        placeholder: m.labels.lblSelectLevel1,
    });
    c.lp.levels.selLevel2 = ui.Select({
        items: [],
        placeholder: m.labels.lblSelectLevel1First,
    });

    c.lp.levels.lblChooseLUS = ui.Label(m.labels.lblLUS);
    c.lp.levels.selLevelLUS = ui.Select({
        items: [],
        placeholder: m.labels.lblSelectLUS,
    });

    // Left Panel - Layer for boundaries selection
    c.lp.boundaries = {};
    c.lp.boundaries.lblChoose = ui.Label(m.labels.lblAssetClick + ' (*)');
    c.lp.boundaries.selBoundariesLayer = ui.Select({
        items: Object.keys(m.assetsClick),
        value: m.labels.lblNone,
    });

    // Left Panel - General layers section    
    c.lp.gl = {};
    c.lp.gl.lblLayersLegends = ui.Label(m.labels.lblLayers);
    c.lp.gl.pnlContainer = ui.Panel();

    m.layerEntries.filter(function (e) {
        return e.group === 'FEATURES';
    }).forEach(function (layer) {
        c.lp.gl.pnlContainer.add(mdlLegends.createLayerEntry(layer));

    });

    m.layerEntries.filter(function (e) {
        return e.group === 'RASTER';
    }).forEach(function (layer) {
        c.lp.gl.pnlContainer.add(mdlLegends.createLayerEntry(layer));
    });

    // Left Panel - Multi-criteria analysis section   
    c.lp.mc = {};
    c.lp.mc.selMcOptions = ui.Select({
        items: [m.labels.lblMcSimple, m.labels.lblMcAdvanced],
        value: m.labels.lblMcSimple
    });
    c.lp.mc.btnMcAnalysis = ui.Button(m.labels.lblHotspots);
    c.lp.mc.pnlEntries = mdlLegends.createMultiCriteriaPanel(m.mcEntries);
    c.lp.mc.lblDisplay = ui.Label(m.labels.lblStepDisplay);
    c.lp.mc.btnCalculate = ui.Button({ label: m.labels.lblDisplay, disabled: true });
    c.lp.mc.btnReset = ui.Button({ label: m.labels.lblReset, disabled: true });
    c.lp.mc.pnlButtons = ui.Panel({
        layout: ui.Panel.Layout.flow('horizontal'),
        widgets: [c.lp.mc.btnCalculate, c.lp.mc.btnReset]
    });
    c.lp.mc.pnlContainer = ui.Panel({
        widgets: [
            c.lp.mc.pnlEntries,
            c.lp.mc.lblDisplay,
            c.lp.mc.pnlButtons]
    });

    // Left Panel - Transitions section
    c.lp.tr = {};
    c.lp.tr.btnTransitions = ui.Button(m.labels.lblLCTransitionAnalysis);
    c.lp.tr.pnlContainer = ui.Panel();

    c.lp.tr.lblSource = ui.Label(m.labels.lblLCSource + ': ');
    c.lp.tr.selSources = ui.Select({
        items: ['NATIONAL'],
        value: m.selectedSource.name,
    });
    c.lp.tr.pnlSource = ui.Panel({
        layout: ui.Panel.Layout.flow('horizontal'),
        widgets: [c.lp.tr.lblSource, c.lp.tr.selSources]
    });
    c.lp.tr.lblInitialYears = ui.Label(m.labels.lblSelectLCYear + ': ');
    c.lp.tr.selLCFromYears = ui.Select({
        items: m.selectedSource.initialYears,
        value: m.selectedSource.yearsLC[0],
    });
    c.lp.tr.pnlFromYear = ui.Panel({
        layout: ui.Panel.Layout.flow('horizontal'),
        widgets: [c.lp.tr.lblInitialYears, c.lp.tr.selLCFromYears]
    });
    c.lp.tr.pnlLayers = ui.Panel();
    m.transitionsEntries.forEach(function (layer) {
        c.lp.tr.pnlLayers.add(mdlLegends.createLayerEntry(layer));
    });
    //c.lp.tr.pnlContainer.add(c.lp.tr.pnlSource);
    c.lp.tr.pnlContainer.add(c.lp.tr.pnlFromYear);
    c.lp.tr.pnlContainer.add(c.lp.tr.pnlLayers);

    // Left Panel - Drawing tool section
    c.lp.dt = {};
    c.lp.dt.btnDrawingTools = ui.Button(m.labels.lblDrawingTools + ' 📍');

    c.lp.dt.lblCustomLayer = ui.Label(m.labels.lblCustomLayer);
    c.lp.dt.txbLayerName = ui.Textbox(m.labels.lblLayerName, '');
    c.lp.dt.btnAddLayer = ui.Button('+');
    c.lp.dt.pnlFileName = ui.Panel({
        widgets: [c.lp.dt.txbLayerName, c.lp.dt.btnAddLayer],
        layout: ui.Panel.Layout.Flow('horizontal'),
    });
    c.lp.dt.lblDrawFeatures = ui.Label(m.labels.lblDrawFeatures);
    c.lp.dt.lblGetStatistics = ui.Label(m.labels.lblGetStatistics);
    c.lp.dt.btnZonalStats = ui.Button(m.labels.lblSelectAndCalculate);
    c.lp.dt.lblDownloadLinks = ui.Label(m.labels.lblDownloadLinks);
    c.lp.dt.lblLinks = ui.Label(m.labels.lblLinks);
    c.lp.dt.lblJson = ui.Label();
    c.lp.dt.lblKml = ui.Label();
    c.lp.dt.pnlLinks = ui.Panel({
        widgets: [c.lp.dt.lblLinks, c.lp.dt.lblJson, c.lp.dt.lblKml],
        layout: ui.Panel.Layout.Flow('horizontal'),
    });
    c.lp.dt.pnlContainer = ui.Panel({
        widgets: [
            c.lp.dt.lblCustomLayer,
            c.lp.dt.pnlFileName,
            c.lp.dt.lblDrawFeatures,
            c.lp.dt.lblGetStatistics,
            c.lp.dt.btnZonalStats,
            c.lp.dt.lblDownloadLinks,
            c.lp.dt.pnlLinks
        ]
    });

    // Left Panel - Opacity control section
    c.lp.op = {};
    c.lp.op.lblOpacity = ui.Label(m.labels.lblFrontLayerOpacity);
    c.lp.op.sldOpacity = ui.Slider({
        min: 0,
        max: 1,
        value: 1,
        step: 0.1,
    });
    c.lp.op.pnlSlider = ui.Panel({
        widgets: [c.lp.op.lblOpacity, c.lp.op.sldOpacity],
        layout: ui.Panel.Layout.Flow('horizontal'),
    });

    // Left Panel - Disclaimer section
    c.lp.lblDisclaimer = ui.Label('(*) ' + m.labels.lblDisclaimer);

    // Center Panel   
    c.cp.map = ui.Map();
    c.cp.pnlCombinedLegend = ui.Panel();
    c.cp.pnlFrontLayerLegend = ui.Panel();
    c.cp.drt = ui.Map.DrawingTools();
    c.cp.btnSelectContainer = ui.Button(m.labels.lblSelectContainer);

    c.cp.slm = {};
    c.cp.slm.pnlSLM = ui.Panel();
    c.cp.slm.lblSLMTitle = ui.Label(m.labels.lblLoading);
    c.cp.slm.pnlSLM.add(c.cp.slm.lblSLMTitle);
    c.cp.slm.ge = {};
    c.cp.slm.ge.pnlEntryLink = ui.Panel({
        widgets: [ui.Label(m.labels.lblLoading)],
    });
    c.cp.slm.ge.pnlEntryDescription = ui.Panel({
        widgets: [ui.Label(m.labels.lblLoading)],
    });
    // Add entries to general stats panel
    Object.keys(c.cp.slm.ge).forEach(function (key) {
        c.cp.slm.ge[key].setLayout(ui.Panel.Layout.Flow('horizontal'));
        c.cp.slm.pnlSLM.add(c.cp.slm.ge[key]);
    });

    // Right Panel - Messages panel section
    c.rp.lblMessages = ui.Label('');
    c.rp.pnlMessages = ui.Panel({
        widgets: [c.rp.lblMessages]
    });

    // Right Panel - Stats panel section
    c.rp.stats = {};
    c.rp.stats.pnlStats = ui.Panel();
    c.rp.stats.lblStatsTitle = ui.Label(m.labels.lblSelectedAOI);
    c.rp.stats.lblHighlightBox = ui.Label();
    c.rp.stats.pnlSelectedArea = ui.Panel({
        widgets: [c.rp.stats.lblStatsTitle, c.rp.stats.lblHighlightBox],
        layout: ui.Panel.Layout.Flow("horizontal"),

    });
    c.rp.stats.pnlStats.add(c.rp.stats.pnlSelectedArea);

    // -> Right Panel - Stats panel sectionl - general entries 
    c.rp.stats.ge = {};
    c.rp.stats.ge.pnlEntryAreaName = ui.Panel({
        widgets: [ui.Label(m.labels.lblAreaName + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.ge.pnlEntryArea = ui.Panel({
        widgets: [ui.Label(m.labels.lblArea + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.ge.pnlEntryVegetatedArea = ui.Panel({
        widgets: [ui.Label(m.labels.lblVegetatedArea + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.ge.pnlEntryDecliningProductivity = ui.Panel({
        widgets: [ui.Label(m.labels.lblDecliningProductivity + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.ge.pnlEntryIncreasingProductivity = ui.Panel({
        widgets: [ui.Label(m.labels.lblIncreasingProductivity + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.ge.pnlEntrySocMean = ui.Panel({
        widgets: [ui.Label(m.labels.lblSocMean + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.ge.pnlEntrySocSum = ui.Panel({
        widgets: [ui.Label(m.labels.lblSocSum + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.ge.pnlEntryProtectedArea = ui.Panel({
        widgets: [ui.Label(m.labels.lblProtectedArea + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.ge.pnlEntryKeyBiodiversityArea = ui.Panel({
        widgets: [ui.Label(m.labels.lblKeyBiodiversityArea + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.ge.pnlEntryMountainCoverage = ui.Panel({
        widgets: [ui.Label(m.labels.lblMountainCoverage + ': '), ui.Label(m.labels.lblLoading)],
    });

    // -> Right Panel - Stats panel section - add entries to general stats panel
    Object.keys(c.rp.stats.ge).forEach(function (key) {
        c.rp.stats.ge[key].setLayout(ui.Panel.Layout.Flow('horizontal'));
        c.rp.stats.pnlStats.add(c.rp.stats.ge[key]);
    });

    // Right Panel - QM panel section
    c.rp.stats.pnlQM = ui.Panel();
    c.rp.stats.lblQMTitle = ui.Label(m.labels.lblQMMappingUnit);
    c.rp.stats.pnlQM.add(c.rp.stats.lblQMTitle);

    // -> Right Panel - QM panel section - entries
    c.rp.stats.qm = {};
    c.rp.stats.qm.pnlEntryDegExtension = ui.Panel({
        widgets: [ui.Label(m.labels.lblDegExtension + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.qm.pnlEntryDegType = ui.Panel({
        widgets: [ui.Label(m.labels.lblDegType + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.qm.pnlEntryDegSubType = ui.Panel({
        widgets: [ui.Label(''), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.qm.pnlEntryDegDegree = ui.Panel({
        widgets: [ui.Label(m.labels.lblQMDegradationDegree + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.qm.pnlEntryDegDirCauses = ui.Panel({
        widgets: [ui.Label(m.labels.lblDegDirCauses + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.qm.pnlEntryDegImpact = ui.Panel({
        widgets: [ui.Label(m.labels.lblDegImpact + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.qm.pnlEntryRecommendation = ui.Panel({
        widgets: [ui.Label(m.labels.lblQMRecommendation + ': '), ui.Label(m.labels.lblLoading)],
    });


    // -> Right Panel - QM panel section - add entries to QM panel 
    Object.keys(c.rp.stats.qm).forEach(function (key) {
        c.rp.stats.qm[key].setLayout(ui.Panel.Layout.Flow('horizontal'));
        c.rp.stats.pnlQM.add(c.rp.stats.qm[key]);
    });

    // Right Panel - HIH Canton panel section
    c.rp.stats.pnlCanton = ui.Panel();
    c.rp.stats.lblCantonTitle = ui.Label(m.labels.lblHihInfo);
    c.rp.stats.pnlCanton.add(c.rp.stats.lblCantonTitle);

    // -> Right Panel - HIH Canton panel section - entries
    c.rp.stats.canton = {};
    c.rp.stats.canton.pnlEntryAgriculturePotential = ui.Panel({
        widgets: [ui.Label(m.labels.lblAgriculturalPotential + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.canton.pnlEntryTechnicalEfficiency = ui.Panel({
        widgets: [ui.Label(m.labels.lblTechnicalEfficiency + ': '), ui.Label(m.labels.lblLoading)],
    });
    c.rp.stats.canton.pnlEntryRuralPoverty = ui.Panel({
        widgets: [ui.Label(m.labels.lblRuralPoverty + ': '), ui.Label(m.labels.lblLoading)],
    });

    //-> Right Panel - HIH Canton panel section - add entries to HiH Canton panel
    Object.keys(c.rp.stats.canton).forEach(function (key) {
        c.rp.stats.canton[key].setLayout(ui.Panel.Layout.Flow('horizontal'));
        c.rp.stats.pnlCanton.add(c.rp.stats.canton[key]);
    });

    // Right Panel - Charts panels section
    c.rp.charts = {};
    c.rp.charts.pnlGeneralCharts = ui.Panel();
    c.rp.charts.lblGeneralChartsTitle = ui.Label(m.labels.lblGeneralCharts);
    c.rp.charts.pnlGeneralCharts.add(c.rp.charts.lblGeneralChartsTitle);

    c.rp.charts.pnlMcCharts = ui.Panel();
    c.rp.charts.lblMcChartsTitle = ui.Label(m.labels.lblHotspotsCharts);
    c.rp.charts.pnlMcCharts.add(c.rp.charts.lblMcChartsTitle);

    c.rp.charts.pnlTransitionsCharts = ui.Panel();
    c.rp.charts.lblTransitionsChartsTitle = ui.Label(m.labels.lblTransitionsCharts + ' - ' + m.selectedSource.name);
    c.rp.charts.pnlTransitionsCharts.add(c.rp.charts.lblTransitionsChartsTitle);

    /*******************************************************************************
    * 3-Composition *   
    ******************************************************************************/

    ui.root.clear();
    ui.root.add(c.pnlRoot);

    c.pnlRoot.add(c.lp.pnlControl);
    c.pnlRoot.add(c.sppMapOutput);

    // Left - Control panel
    //c.lp.pnlControl.add(c.lp.info.tmbLogo);
    c.lp.pnlControl.add(c.lp.info.lblIntro);
    c.lp.pnlControl.add(c.lp.info.lblApp);
    c.lp.pnlControl.add(c.lp.info.lblAppDev);
    c.lp.pnlControl.add(c.lp.info.lblEmail1);
    c.lp.pnlControl.add(c.lp.info.lblEmail2);
    c.lp.pnlControl.add(c.lp.info.lblEmail3);
    c.lp.pnlControl.add(c.lp.info.lblcitation);

    c.lp.pnlControl.add(c.lp.lan.selLanguage);

    c.lp.pnlControl.add(c.lp.levels.lblChoose);
    c.lp.pnlControl.add(c.lp.levels.selLevel1);
    c.lp.pnlControl.add(c.lp.levels.selLevel2);
    c.lp.pnlControl.add(c.lp.levels.lblChooseLUS);
    c.lp.pnlControl.add(c.lp.levels.selLevelLUS);

    c.lp.pnlControl.add(c.lp.boundaries.lblChoose);
    c.lp.pnlControl.add(c.lp.boundaries.selBoundariesLayer);

    c.lp.pnlControl.add(c.lp.gl.lblLayersLegends);
    c.lp.pnlControl.add(c.lp.gl.pnlContainer);

    c.lp.pnlControl.add(c.lp.mc.btnMcAnalysis);
    c.lp.pnlControl.add(c.lp.mc.selMcOptions);
    c.lp.pnlControl.add(c.lp.mc.pnlContainer);

    c.lp.pnlControl.add(c.lp.tr.btnTransitions);
    c.lp.pnlControl.add(c.lp.tr.pnlContainer);

    c.lp.pnlControl.add(c.lp.op.pnlSlider);

    c.lp.pnlControl.add(c.lp.dt.btnDrawingTools);
    c.lp.pnlControl.add(c.lp.dt.pnlContainer);

    c.lp.pnlControl.add(c.lp.lblDisclaimer);

    // Center - Map panel 
    c.cp.pnlMap.add(c.cp.map);
    c.cp.map.add(c.cp.pnlFrontLayerLegend);
    c.cp.map.add(c.cp.slm.pnlSLM);
    c.cp.map.add(c.cp.drt);
    c.cp.map.add(c.cp.btnSelectContainer);

    // Right - Output panel 
    c.rp.pnlOutput.add(c.rp.pnlMessages);
    c.rp.pnlOutput.add(c.rp.stats.pnlStats);
    c.rp.pnlOutput.add(c.rp.stats.pnlQM);
    c.rp.pnlOutput.add(c.rp.stats.pnlCanton);

    c.rp.pnlOutput.add(c.rp.charts.pnlGeneralCharts);
    c.rp.pnlOutput.add(c.rp.charts.pnlMcCharts);
    c.rp.pnlOutput.add(c.rp.charts.pnlTransitionsCharts);


    /*******************************************************************************
    * 4-Styling *  
    ******************************************************************************/

    // JSON object for defining CSS-like class style properties.
    var s = {};

    //c.pnlRoot.style().set({ height: '100%', width: '100%', });

    // ------------- STYLES LEFT PANEL
    /*c.lp.pnlControl.style().set({ height: '100%', width: '20%', });
    c.cp.pnlMap.style().set({ height: '100%', width: '80%', });
    c.rp.pnlOutput.style().set({ height: '100%', width: '20%', });*/

    s.style1 = { fontSize: '12px', margin: '2px 10px' };
    s.styleMessage = { color: 'gray', fontSize: '12px', padding: '2px 0px 2px 10px' };
    s.styleWarning = { color: 'blue', fontSize: '12px' };

    c.lp.info.lblIntro.style().set({ fontWeight: 'bold', fontSize: '20px', margin: '10px 5px', });
    c.lp.info.lblApp.style().set({ fontSize: '12px' });
    c.lp.info.lblAppDev.style().set(s.style1);
    c.lp.info.lblEmail1.style().set(s.style1);
    c.lp.info.lblEmail2.style().set(s.style1);
    c.lp.info.lblEmail3.style().set(s.style1);
    c.lp.info.lblcitation.style().set(s.style1);

    c.lp.lan.selLanguage.style().set({ width: '70%' });

    c.lp.levels.lblChoose.style().set(s.style1);
    c.lp.levels.selLevel1.style().set({ width: "90%", });
    c.lp.levels.selLevel2.style().set({ width: "90%", });
    c.lp.levels.lblChooseLUS.style().set(s.style1);
    c.lp.levels.selLevelLUS.style().set({ width: "90%", });

    c.lp.boundaries.lblChoose.style().set(s.style1);
    c.lp.boundaries.selBoundariesLayer.style().set({ width: '70%' });

    c.lp.gl.lblLayersLegends.style().set({ fontSize: '12px', fontWeight: 'bold' });
    c.lp.gl.pnlContainer.style().set({ margin: '0px 5px', shown: true });

    s.sectionButton = { width: '90%', fontSize: '6px', fontWeight: 'normal' };
    s.sectionPanel = { margin: '5px 5px', shown: false, width: '90%' };
    s.paramPanel = { width: '90%', fontSize: '12px', margin: '0px', padding: '0px' };

    // Multicriteria Section
    c.lp.mc.btnMcAnalysis.style().set(s.sectionButton);
    c.lp.mc.btnMcAnalysis.style().set({ color: '#900303' });
    c.lp.mc.selMcOptions.style().set({ shown: false });
    c.lp.mc.pnlContainer.style().set(s.sectionPanel);
    c.lp.mc.pnlContainer.style().set({ border: '3px solid #900303' });
    c.lp.mc.lblDisplay.style().set({
        fontWeight: 'bold',
        fontSize: '12px',
        margin: '1px 1px 1px 5px',
        padding: '2px',
    });
    c.lp.mc.btnCalculate.style().set({ width: '40%' });
    c.lp.mc.btnReset.style().set({ width: '40%' });

    // Transitions Section
    c.lp.tr.btnTransitions.style().set(s.sectionButton);
    c.lp.tr.btnTransitions.style().set({ color: 'green' });
    c.lp.tr.pnlContainer.style().set(s.sectionPanel);
    c.lp.tr.pnlContainer.style().set({ border: '3px solid green' });
    c.lp.tr.selSources.style().set({ margin: '0px', padding: '5px 0 0 0' });
    c.lp.tr.selLCFromYears.style().set({ margin: '0px', padding: '5px 0 0 0' });
    c.lp.tr.pnlSource.style().set(s.paramPanel);
    c.lp.tr.pnlFromYear.style().set(s.paramPanel);

    // Drawing tools Section
    c.lp.dt.btnDrawingTools.style().set(s.sectionButton);
    c.lp.dt.pnlContainer.style().set(s.sectionPanel);
    c.lp.dt.pnlContainer.style().set({ border: '3px solid black' });
    c.lp.dt.lblCustomLayer.style().set({ fontSize: '12px' });
    c.lp.dt.pnlFileName.style().set({ margin: '0px 5px' });
    c.lp.dt.txbLayerName.style().set({ width: '60%', fontSize: '12px' })
    c.lp.dt.lblDrawFeatures.style().set({ fontSize: '12px' });
    c.lp.dt.lblGetStatistics.style().set({ fontSize: '12px' });
    c.lp.dt.lblJson.style().set({ fontSize: '12px' });
    c.lp.dt.lblKml.style().set({ fontSize: '12px' });
    c.lp.dt.lblDownloadLinks.style().set({ fontSize: '12px' });
    c.lp.dt.lblLinks.style().set({ fontSize: '12px' });

    c.lp.op.lblOpacity.style().set({ fontSize: '12px' });
    c.lp.lblDisclaimer.style().set({ fontSize: '10px', margin: '2px 10px' });

    // --------- STYLES 
    s.styleStatsValue = { margin: '4px 0px', fontSize: '12px', whiteSpace: 'pre' };
    s.styleStatsHeader = { margin: '4px 0px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'pre' };
    s.styleInfoTitle = { fontSize: '16px', fontWeight: 'bold', margin: '4px 0px' };
    s.styelChartPanelTitle = { fontSize: '16px', fontWeight: 'bold', margin: '4px 15px' };

    // --------- STYLES CENTER PANEL
    c.cp.pnlFrontLayerLegend.style().set({ position: 'bottom-left' });
    c.cp.pnlCombinedLegend.style().set({ shown: false });
    c.cp.btnSelectContainer.style().set({ position: "bottom-right" });
    c.cp.slm.pnlSLM.style().set({ width: '300px', shown: false, position: "bottom-right" });
    c.cp.slm.lblSLMTitle.style().set(s.styleInfoTitle);
    Object.keys(c.cp.slm.ge).forEach(function (key) {
        c.cp.slm.ge[key].widgets().get(0).style().set({ stretch: 'horizontal' });

    });

    c.cp.map.style().set('cursor', 'crosshair');

    // Messages Panel
    c.rp.pnlMessages.style().set({ padding: '8px 15px' });
    c.rp.lblMessages.style().set(s.styleWarning);
    c.rp.lblMessages.style().set({ margin: '4px 0px' });

    // Stats Panel
    c.rp.stats.lblStatsTitle.style().set(s.styleInfoTitle);
    c.rp.stats.lblHighlightBox.style().set({
        border: "2px solid " + m.lv.highlight.vis.color,
        padding: "5px",
        margin: "7px 0 0 5px",
    });
    c.rp.stats.pnlStats.style().set({ padding: '8px 15px', });
    Object.keys(c.rp.stats.ge).forEach(function (key) {
        c.rp.stats.ge[key].widgets().get(0).style().set(s.styleStatsHeader);
        c.rp.stats.ge[key].widgets().get(1).style().set(s.styleStatsValue);
    });

    // QM Panel
    c.rp.stats.pnlQM.style().set({ padding: '8px 15px', shown: false });
    c.rp.stats.lblQMTitle.style().set(s.styleInfoTitle);
    Object.keys(c.rp.stats.qm).forEach(function (key) {
        c.rp.stats.qm[key].widgets().get(0).style().set(s.styleStatsHeader);
        c.rp.stats.qm[key].widgets().get(1).style().set(s.styleStatsValue);
    });

    // CANTON Panel
    c.rp.stats.pnlCanton.style().set({ padding: '8px 15px', shown: false });
    c.rp.stats.lblCantonTitle.style().set(s.styleInfoTitle);
    Object.keys(c.rp.stats.canton).forEach(function (key) {
        c.rp.stats.canton[key].widgets().get(0).style().set(s.styleStatsHeader);
        c.rp.stats.canton[key].widgets().get(1).style().set(s.styleStatsValue);
    });

    // Charts Panels
    c.rp.charts.lblGeneralChartsTitle.style().set(s.styelChartPanelTitle);
    c.rp.charts.lblMcChartsTitle.style().set(s.styelChartPanelTitle);
    c.rp.charts.lblTransitionsChartsTitle.style().set(s.styelChartPanelTitle);

    /*******************************************************************************
    * 5-Behaviors *   
    ******************************************************************************/

    var formatNumber = function (number, digits) {
        return number.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    }

    var sortByLabel = function (a, b) {
        if (a.label < b.label) { return -1; }
        if (a.label > b.label) { return 1; }
        return 0;
    };
    var createChartPanel = function (container) {
        var pnlChart = ui.Panel();
        container.add(pnlChart);
        return pnlChart;
    }

    /** Handles which charts are shown in the right panel */
    var handleChartsPanelsShown = function () {
        c.rp.charts.pnlTransitionsCharts.style().set({ shown: (c.lp.tr.pnlContainer.style().get('shown') ? true : false) });
        c.rp.charts.pnlMcCharts.style().set({ shown: (c.lp.mc.pnlContainer.style().get('shown') ? true : false) });
        c.rp.charts.pnlGeneralCharts.style().set({
            shown: (!c.lp.tr.pnlContainer.style().get('shown') &&
                !c.lp.mc.pnlContainer.style().get('shown') ? true : false)
        });
    }

    /** Shows or hides specified layer in map */
    var showLayer = function (name, shown) {
        var i = m.namesLayers.indexOf(name);
        if (m.namesLayers.indexOf(name) >= 0) {
            c.cp.map.layers().get(i).setShown(shown);
        }
    }

    /** Shows the front layer legend (shows legend for first selected layer, from bottom to top, in order of apearence in left panel list) */
    var showFrontLayerLegend = function () {
        c.cp.pnlFrontLayerLegend.clear();
        var chk;

        // If transitions panel is open check if some layer is selected
        if (c.lp.tr.pnlContainer.style().get('shown')) {
            for (var i = c.lp.tr.pnlLayers.widgets().length() - 1; i >= 0; i--) {
                chk = c.lp.tr.pnlLayers.widgets().get(i).widgets().get(0);
                if (chk.getValue()) {
                    c.cp.pnlFrontLayerLegend.widgets().set(0, m.transitionsEntries[i].legend);
                    return;
                }
            }

        }
        for (var j = c.lp.gl.pnlContainer.widgets().length() - 1; j >= 0; j--) {
            chk = c.lp.gl.pnlContainer.widgets().get(j).widgets().get(0);
            if (chk.getValue()) {
                var l = null;
                for (var g = 0; g < m.layerEntries.length; g++) {
                    if (m.layerEntries[g].name === chk.getLabel()) {
                        l = m.layerEntries[g].legend;
                        break;
                    }
                }
                if (l !== null) {
                    c.cp.pnlFrontLayerLegend.widgets().set(0, l);
                    return;
                }
            }
        }
    };

    /** Reloads app with selected language levels */
    c.lp.lan.selLanguage.onChange(function (lan) { initApp(lan); });

    /** Reloads multicriteria panel with corresponding entries*/
    c.lp.mc.selMcOptions.onChange(function (type) {
        clearCombinedLayerAndLegend();

        if (type === m.labels.lblMcSimple)
            m.mcEntries = m.mcEntriesPrecalculated;
        else
            m.mcEntries = m.mcEntriesOnTheFly;

        c.lp.mc.pnlEntries = mdlLegends.createMultiCriteriaPanel(m.mcEntries);
        c.lp.mc.pnlContainer.widgets().set(0, c.lp.mc.pnlEntries)

    });

    // Stack general layers on the map 
    m.layerEntries.forEach(function (layer) {
        if (layer.group === 'FEATURES') {
            c.cp.map.addLayer(layer.asset.style(layer.style), {}, layer.name, layer.visible);
        }
        else {
            c.cp.map.addLayer(layer.asset, layer.style, layer.name, layer.visible);
        }
    });

    // Stack transitions layers on the map 
    m.transitionsEntries.forEach(function (layer) {
        c.cp.map.addLayer(layer.asset, layer.style, layer.label, layer.visible);
    });

    // Stack multicriteria layer (dinamically updated later)
    c.cp.map.addLayer(a.imgCustom, m.lv.custom.vis, m.labels.lblHotspots, false);

    // Add on check/uncheck functionality to general layers entries
    c.lp.gl.pnlContainer.widgets().forEach(function (w) {
        w.widgets().get(0).onChange(function (checked) {
            showLayer(w.widgets().get(0).getLabel(), checked);
            showFrontLayerLegend();
        });
    });

    // Add on check/uncheck functionality to transitions layers entries
    c.lp.tr.pnlLayers.widgets().forEach(function (w, i) {
        w.widgets().get(0).onChange(function (checked) {
            showLayer(m.transitionsEntries[i].label, checked);
            showFrontLayerLegend();
        });
    });

    // On slide in opacity control get last non boundaries layer and apply selected opacity
    c.lp.op.sldOpacity.onSlide(function (value) {
        var layersArray = c.cp.map.layers().getJsArray();
        var lastShown = null;
        for (var i = layersArray.length - 1; i >= 0; i--) {
            var l = layersArray[i];
            // find last non-border layer that is shown
            if (lastShown === null
                && l.getName() !== m.labels.lblSelectedAOI
                && l.getName() !== m.labels.lblLevel1
                && l.getName() !== m.labels.lblLevel2
                && l.getName() !== m.labels.lblBasins
                && l.getName() !== m.labels.lblSubbasins
                && l.getName() !== m.labels.lblSLM
                && l.getShown()
            ) {
                lastShown = c.cp.map.layers().get(i);
            }
            c.cp.map.layers().get(i).setOpacity(1); // for all other layers
        }
        if (lastShown !== null) {
            lastShown.setOpacity(value);
        }
    });


    c.lp.boundaries.selBoundariesLayer.onChange(function (v) {
        // set asset for handling click on map
        m.ftcClickOn = m.assetsClick[v];

        if (m.ftcClickOn !== null) {
            // show layer on map
            for (var i = 0; i < c.lp.gl.pnlContainer.widgets().length(); i++) {
                var chk = c.lp.gl.pnlContainer.widgets().get(i).widgets().get(0);
                if (chk.getLabel() === v) {
                    chk.setValue(true);
                    break;
                }
            }
            // hide drawing tool panel
            c.lp.dt.pnlContainer.style().set({ shown: false });
            c.cp.map.drawingTools().stop();
            c.cp.map.drawingTools().setShown(false);
            c.cp.map.drawingTools().layers().forEach(function (l) {
                l.setShown(false);
            });
        }
    });

    /** Shows precalculated stats and charts for selected area of interest. 
     *  AOI could be choosen from provinces/cantons selects, by clicking on the map to select an area or by drawing on the map.
     *  If area of interest is a user drawn-feature it calculates all stats on the fly, otherwise stats are retrieved from the asset attributes table.*/
    var showInfoSelectedAoi = function () {
        handleEvaluating(true);

        Object.keys(c.rp.stats.ge).forEach(function (key) {
            c.rp.stats.ge[key].widgets().get(1).setValue(m.labels.lblLoading);
        });
        Object.keys(c.rp.stats.qm).forEach(function (key) {
            c.rp.stats.qm[key].widgets().get(1).setValue(m.labels.lblLoading);
        });

        Object.keys(c.rp.stats.canton).forEach(function (key) {
            c.rp.stats.canton[key].widgets().get(1).setValue(m.labels.lblLoading);
        });

        c.rp.stats.pnlQM.style().set({ shown: false });
        c.rp.stats.pnlCanton.style().set({ shown: false });

        var f;
        if (m.precalculated) {
            var selectedArea = m.ftcAoi.first();

            // Get area value in precalculated row, for drawn-feature is already calculated
            m.haAoi = selectedArea.get('area_ha').getInfo();
            var statslCols = [
                'name',
                'lpd_0',
                'lpd_1',
                'lpd_2',
                'lpd_3',
                'lpd_4',
                'lpd_5',
                'pa_ha',
                'kba_bin_1',
                'mountain_bin_1',
                'soc_sum',
                'soc_mean',
            ];

            if (m.levelAoi === m.labels.lblQM) {
                c.rp.stats.pnlQM.style().set({ shown: true });
                statslCols = statslCols.concat(['extent_1', 'Degra_desc', 'Dir_cau_GG', 'Imp_SE_GG', 'RECOMMENDA', 'degree_1', 'Dgr1_tipo']);
            }
            else if (m.levelAoi === m.labels.lblLevel2) {
                c.rp.stats.pnlCanton.style().set({ shown: true });
                statslCols = statslCols.concat(['Apotential', 'Aefficienc', 'Apoverty_p']);
            }

            f = ee.Feature(null).copyProperties(selectedArea, statslCols);
        }
        else {
            // Calculate all statistics required for info panel
            var ftcSampleStats = mdlPrecalculation.precalculate(m.ftcAoi, [
                'lpd',
                'soc_sum',
                'soc_mean',
                'pa',
                'kba_bin',
                'mountain_bin'
            ]);
            f = ftcSampleStats.first();

        }
        c.rp.stats.ge.pnlEntryArea.widgets().get(1).setValue(formatNumber(m.haAoi, 2) + ' ha.');

        m.evalSet["stats"] = true;
        f.evaluate(function (ef, error) {
            delete m.evalSet["stats"];
            if (Object.keys(m.evalSet).length === 0) {
                handleEvaluating(false);
            }
            if (ef) {
                c.rp.stats.ge.pnlEntryAreaName.widgets().get(1).setValue(ef.properties.name);

                var haVegetated = ef.properties.lpd_1 + ef.properties.lpd_2 + ef.properties.lpd_3 + ef.properties.lpd_4 + ef.properties.lpd_5;
                c.rp.stats.ge.pnlEntryVegetatedArea.widgets().get(1).setValue(formatNumber(haVegetated, 2) + " ha.");

                var decliningProdTotal = ef.properties.lpd_1 + ef.properties.lpd_2;
                var aux = m.haAoi > 0 ? (decliningProdTotal * 100 / haVegetated) : 0;
                c.rp.stats.ge.pnlEntryDecliningProductivity.widgets().get(1).setValue(formatNumber(decliningProdTotal, 2) + ' ha. (' + aux.toFixed(2) + '%)');

                aux = m.haAoi > 0 ? (ef.properties.lpd_5 * 100 / haVegetated) : 0;
                c.rp.stats.ge.pnlEntryIncreasingProductivity.widgets().get(1).setValue(formatNumber(ef.properties.lpd_5, 2) + ' ha. (' + aux.toFixed(2) + '%)');

                aux = m.haAoi > 0 ? (ef.properties.pa_ha * 100 / m.haAoi) : 0;
                c.rp.stats.ge.pnlEntryProtectedArea.widgets().get(1).setValue(formatNumber(ef.properties.pa_ha, 2) + " ha. (" + aux.toFixed(2) + "%)");

                aux = m.haAoi > 0 ? (ef.properties.kba_bin_1 * 100 / m.haAoi) : 0;
                c.rp.stats.ge.pnlEntryKeyBiodiversityArea.widgets().get(1).setValue(formatNumber(ef.properties.kba_bin_1, 2) + " ha. (" + aux.toFixed(2) + "%)");

                aux = m.haAoi > 0 ? (ef.properties.mountain_bin_1 * 100 / m.haAoi) : 0;
                c.rp.stats.ge.pnlEntryMountainCoverage.widgets().get(1).setValue(formatNumber(ef.properties.mountain_bin_1, 2) + " ha. (" + aux.toFixed(2) + "%)");

                c.rp.stats.ge.pnlEntrySocSum.widgets().get(1).setValue(formatNumber(ef.properties.soc_sum, 2) + ' t');
                c.rp.stats.ge.pnlEntrySocMean.widgets().get(1).setValue(formatNumber(ef.properties.soc_mean, 2) + ' t/ha');

                // If aoi is qm level show qm info
                if (m.levelAoi === m.labels.lblQM) {
                    c.rp.stats.qm.pnlEntryDegExtension.widgets().get(1).setValue(ef.properties.extent_1 + '%');
                    c.rp.stats.qm.pnlEntryDegType.widgets().get(1).setValue(ef.properties.Dgr1_tipo);
                    c.rp.stats.qm.pnlEntryDegSubType.widgets().get(1).setValue('(' + ef.properties.Degra_desc + ')');

                    c.rp.stats.qm.pnlEntryDegDirCauses.widgets().get(1).setValue(ef.properties.Dir_cau_GG);
                    c.rp.stats.qm.pnlEntryDegImpact.widgets().get(1).setValue(ef.properties.Imp_SE_GG);

                    var levelsRecommendations = { P: m.labels.lblPrevention, M: m.labels.lblMitigation, R: m.labels.lblRehabilitation, A: m.labels.lblAdaptation };
                    c.rp.stats.qm.pnlEntryRecommendation.widgets().get(1).setValue(levelsRecommendations[ef.properties.RECOMMENDA]);

                    var levelsDegDegree = { 1: m.labels.lblLight, 2: m.labels.lblModerate, 3: m.labels.lblStrong, 4: m.labels.lblExtreme }
                    c.rp.stats.qm.pnlEntryDegDegree.widgets().get(1).setValue(levelsDegDegree[ef.properties.degree_1]);

                }
                else if (m.levelAoi === m.labels.lblLevel2) {
                    var levelsDict = { 1: m.labels.lblLow, 2: m.labels.lblMedium, 3: m.labels.lblHigh };
                    c.rp.stats.canton.pnlEntryAgriculturePotential.widgets().get(1).setValue(levelsDict[ef.properties.Apotential]);
                    c.rp.stats.canton.pnlEntryTechnicalEfficiency.widgets().get(1).setValue(levelsDict[ef.properties.Aefficienc]);
                    c.rp.stats.canton.pnlEntryRuralPoverty.widgets().get(1).setValue(levelsDict[ef.properties.Apoverty_p]);
                }
            }
            else {
                c.rp.lblMessages.setValue(error);
            }
        });


        try {
            c.cp.map.centerObject(m.ftcAoi);
            c.cp.map.layers().set(m.namesLayers.length, ui.Map.Layer(m.ftcAoi.style(m.lv.highlight.vis), {}, m.labels.lblSelectedAOI));

        } catch (error) {
            c.rp.lblMessages.setValue(error);
        }

        c.cp.map.drawingTools().setSelected(null);

        // Show only charts related to opened panel on the left (General|Multicriteria|Transitions)
        handleChartsPanelsShown();

        // Generate all charts for selected AOI 
        setupGeneralCharts();
        setupMcCharts();
        setupTransitionsCharts();

        clearCombinedLayerAndLegend();

        // Generate combined raster for selected AOI
        if (mcCategoryChecked()) {
            calculateMultiCriteria();
        }
    };

    /** Set AOI from cantons ftc*/
    var handleChangeLevel2 = function (level2Code) {
        m.levelAoi = m.labels.lblLevel2;
        m.ftcAoi = ftc2.filter(ee.Filter.eq('ADM2_CODE', level2Code));
        m.precalculated = true;
        showInfoSelectedAoi();
    };

    /** Set AOI from LUS ftc*/
    var handleChangeLevelLUS = function (lus) {
        if (lus !== null) {
            resetLevelsSelects();
            m.levelAoi = m.labels.lblLUS;
            m.ftcAoi = ftcLUS.filter(ee.Filter.eq('name', lus));
            m.precalculated = true;
            showInfoSelectedAoi();
        }
    }

    /** Set AOI from provinces ftc and reload cantons ftc for selected province*/
    var handleChangeLevel1 = function (level1Code) {
        if (level1Code !== null) {
            resetLUSSelect();

            m.levelAoi = m.labels.lblLevel1;
            m.ftcAoi = ftc1.filter(ee.Filter.eq('ADM1_CODE', level1Code));
            m.precalculated = true;
            showInfoSelectedAoi();

            // load level 2
            c.lp.levels.selLevel2.setPlaceholder(m.labels.lblLoadingLevel2);
            c.lp.levels.selLevel2.items().reset([]);

            var namesLevel2 = m.ftcLelvel2.filter(ee.Filter.eq('ADM1_CODE', level1Code)).aggregate_array('ADM2_NAME');
            var codesLevel2 = m.ftcLelvel2.filter(ee.Filter.eq('ADM1_CODE', level1Code)).aggregate_array('ADM2_CODE');

            namesLevel2.getInfo(function (names2) {
                codesLevel2.getInfo(function (codes2) {
                    var siLevel2 = [];
                    for (var i = 0; i < names2.length; i++) {
                        siLevel2.push({
                            label: names2[i],
                            value: codes2[i]
                        });
                    }

                    siLevel2.sort(sortByLabel);

                    c.lp.levels.selLevel2.unlisten();
                    c.lp.levels.selLevel2.setValue(null);
                    c.lp.levels.selLevel2.items().reset(siLevel2);
                    c.lp.levels.selLevel2.setPlaceholder(m.labels.lblSelectLevel2);
                    c.lp.levels.selLevel2.onChange(handleChangeLevel2);

                });
            });
        }

    };

    /** Resets provinces/cantons selects */
    var resetLevelsSelects = function () {

        c.lp.levels.selLevel1.unlisten();
        c.lp.levels.selLevel2.unlisten();

        c.lp.levels.selLevel1.items().reset(m.siLevel1);
        c.lp.levels.selLevel1.setPlaceholder(m.labels.lblSelectLevel1);
        c.lp.levels.selLevel1.setValue(null);

        c.lp.levels.selLevel2.items().reset([]);
        c.lp.levels.selLevel2.setPlaceholder(m.labels.lblSelectLevel1First);
        c.lp.levels.selLevel2.setValue(null);

        c.lp.levels.selLevel1.onChange(handleChangeLevel1);
        c.lp.levels.selLevel2.onChange(handleChangeLevel2);

    };

    /** Resets LUS select */
    var resetLUSSelect = function () {
        c.lp.levels.selLevelLUS.unlisten();
        c.lp.levels.selLevelLUS.items().reset(m.siLUS);
        c.lp.levels.selLevelLUS.setValue(null);
        c.lp.levels.selLevelLUS.onChange(handleChangeLevelLUS);
    }

    /** Handles value selection in countries/territories dropdown */
    c.lp.levels.selLevel1.onChange(handleChangeLevel1);

    /** Handles value selection in LUS dropdown */
    c.lp.levels.selLevelLUS.onChange(handleChangeLevelLUS);

    /* Handle click on selected layer */
    c.cp.map.onClick(function (coords) {

        c.cp.slm.pnlSLM.style().set({ shown: false });

        if (Object.keys(m.evalSet).length === 0 && !c.lp.dt.pnlContainer.style().get('shown')) {
            if (m.ftcClickOn === null) {
                c.rp.pnlMessages.style().set({ shown: true });
                c.rp.lblMessages.setValue(m.labels.lblSelectLayer);
                return;
            }

            c.rp.lblMessages.setValue('');
            c.cp.map.widgets().remove(c.cp.pnlCombinedLegend);

            if (c.lp.boundaries.selBoundariesLayer.getValue() === m.labels.lblSLM) {

                var ftcBuffer = ftcSLM.map(function (f) {
                    return f.buffer(c.cp.map.getScale() * 10);
                });
                m.assetsClick[m.labels.lblSLM] = ftcBuffer;
                m.ftcClickOn = ftcBuffer;

                var ftcSLMSelected = m.ftcClickOn.filterBounds(ee.Geometry.Point(coords.lon, coords.lat));

                ftcSLMSelected.size().getInfo(function (size) {

                    if (size > 0) {
                        c.cp.map.centerObject(ftcSLMSelected, 12);
                        handleEvaluating(true);
                        c.cp.slm.pnlSLM.style().set({ shown: true });
                        c.cp.slm.lblSLMTitle.setValue(m.labels.lblLoading);
                        Object.keys(c.cp.slm.ge).forEach(function (key) {
                            c.cp.slm.ge[key].widgets().get(0).setValue(m.labels.lblLoading);
                        });
                        m.evalSet["slm"] = true;
                        var f = ee.Feature(null).copyProperties(ftcSLMSelected.first(), ['NameES', 'Link', 'Brief Description']);
                        f.evaluate(function (ef, error) {
                            delete m.evalSet["slm"];
                            if (Object.keys(m.evalSet).length === 0) {
                                handleEvaluating(false);
                            }
                            if (ef) {
                                c.cp.slm.lblSLMTitle.setValue(ef.properties['NameES']);
                                c.cp.slm.ge.pnlEntryLink.widgets().get(0).setValue(m.labels.lblLink).setUrl(ef.properties['Link']);
                                c.cp.slm.ge.pnlEntryDescription.widgets().get(0).setValue(ef.properties['Brief Description']);
                            }
                            else {
                                c.rp.pnlMessages.style().set({ shown: true });
                                c.rp.lblMessages.setValue(error);
                            }
                        });
                    }
                    else {
                        c.rp.pnlMessages.style().set({ shown: true });
                        c.rp.lblMessages.setValue(m.labels.lblNoSLM);
                    }
                });
            }
            else {
                var ftcCheck = m.ftcClickOn.filterBounds(ee.Geometry.Point(coords.lon, coords.lat));

                ftcCheck.size().getInfo(function (size) {
                    if (size > 0) {
                        m.ftcAoi = ftcCheck;
                        resetLevelsSelects();
                        resetLUSSelect();
                        m.precalculated = true;

                        Object.keys(m.assetsClick).forEach(function (key) {
                            if (m.assetsClick[key] === m.ftcClickOn) {
                                m.levelAoi = key;
                            }
                        });
                        showInfoSelectedAoi();
                    }
                    else {
                        c.rp.pnlMessages.style().set({ shown: true });
                        c.rp.lblMessages.setValue(m.labels.lblNoFeature);
                    }

                });
            }
        }
    });

    /**  Unchecks some layers in general layers panel, invoked when advanced panels are opened*/
    var unselectLayersPanelChecks = function () {
        for (var i = 0; i < c.lp.gl.pnlContainer.widgets().length(); i++) {
            var chb = c.lp.gl.pnlContainer.widgets().get(i).widgets().get(0);
            if (chb.getLabel() !== m.labels.lblLevel1
                && chb.getLabel() !== m.labels.lblLevel2
                && chb.getLabel() !== m.labels.lblQM
                && chb.getLabel() !== m.labels.lblLUS
                && chb.getLabel() !== m.labels.lblBasins
                && chb.getLabel() !== m.labels.lblSubbasins
                && chb.getLabel() !== m.labels.lblSLM) {
                chb.setValue(false);
            }
        }
    };

    /** Shows/hides layers checked in Transitions panel*/
    var handleTransitionsLayersVis = function (show) {
        for (var i = c.lp.tr.pnlLayers.widgets().length() - 1; i >= 0; i--) {
            var chk = c.lp.tr.pnlLayers.widgets().get(i).widgets().get(0);
            if (chk.getValue()) {
                showLayer(m.transitionsEntries[i].label, show);
            }
        }
    };

    /** Shows/Hides multicriteria panel and related chart panel */
    c.lp.mc.btnMcAnalysis.onClick(function () {
        c.lp.op.sldOpacity.setValue(1);
        c.lp.mc.pnlContainer.style().set({ shown: !c.lp.mc.pnlContainer.style().get('shown') });
        c.lp.mc.selMcOptions.style().set({ shown: c.lp.mc.pnlContainer.style().get('shown') });

        // If opening multicriteria panel, unselect general layers
        if (c.lp.mc.pnlContainer.style().get('shown')) {
            unselectLayersPanelChecks();
            c.cp.map.setOptions('SATELLITE');
        }
        // Show/Hide previously calculated layer & legend
        showLayer(m.labels.lblHotspots, c.lp.mc.pnlContainer.style().get('shown'));
        if (c.cp.pnlCombinedLegend !== null) {
            c.cp.pnlCombinedLegend.style().set({
                shown: c.lp.mc.pnlContainer.style().get('shown')
            });
        }
        // Hide transitions panel and layer
        c.lp.tr.pnlContainer.style().set({ shown: false });
        handleTransitionsLayersVis(false);

        showFrontLayerLegend();
        handleChartsPanelsShown();
    });

    /** Shows/Hides transitions panel and related chart panel */
    c.lp.tr.btnTransitions.onClick(function () {
        c.lp.op.sldOpacity.setValue(1);

        // Handle transitions panel
        c.lp.tr.pnlContainer.style().set({ shown: !c.lp.tr.pnlContainer.style().get('shown') });
        handleTransitionsLayersVis(c.lp.tr.pnlContainer.style().get('shown'));

        // Handle multi-criteria analysis panel, layer and legend
        c.lp.mc.pnlContainer.style().set({ shown: false });
        c.lp.mc.selMcOptions.style().set({ shown: false });
        showLayer(m.labels.lblHotspots, false);
        c.cp.pnlCombinedLegend.style().set({
            shown: false
        });

        // Handle general layers panel
        if (c.lp.tr.pnlContainer.style().get('shown')) {
            unselectLayersPanelChecks();
            c.cp.map.setOptions('SATELLITE');
        }

        showFrontLayerLegend();
        handleChartsPanelsShown();
    });

    /** Reloads transitions layers according to @param year and source selected*/
    var resetTransitionsLayers = function (year) {

        // Update check labels with selected year
        c.lp.tr.pnlLayers.widgets().get(0).widgets().get(0).setLabel(m.labels.lblLandCover + ' ' + year);
        c.lp.tr.pnlLayers.widgets().get(1).widgets().get(0).setLabel(m.labels.lblLandCover + ' ' + m.selectedSource.lastYear);
        c.lp.tr.pnlLayers.widgets().get(2).widgets().get(0).setLabel(m.labels.lblGains + ' ' + year + ' - ' + m.selectedSource.lastYear);
        c.lp.tr.pnlLayers.widgets().get(3).widgets().get(0).setLabel(m.labels.lblLosses + ' ' + year + ' - ' + m.selectedSource.lastYear);

        // Reload layers
        var imgFrom = m.selectedSource.imgLcAll.select('y' + year).clip(ftc0);
        var lyrFrom = ui.Map.Layer(imgFrom.visualize(m.lv.lc.vis), {}, m.labels.lblFromLC, c.lp.tr.pnlLayers.widgets().get(0).widgets().get(0).getValue());
        c.cp.map.layers().set(m.namesLayers.indexOf(m.labels.lblFromLC), lyrFrom);

        var imgFinal = m.selectedSource.imgLcAll.select('y' + m.selectedSource.lastYear).clip(ftc0);
        var lyrfinal = ui.Map.Layer(imgFinal.visualize(m.lv.lc.vis), {}, m.labels.lblCurrentLC, c.lp.tr.pnlLayers.widgets().get(1).widgets().get(0).getValue());
        c.cp.map.layers().set(m.namesLayers.indexOf(m.labels.lblCurrentLC), lyrfinal);

        var imgGains = m.selectedSource.imgTransitions.select('lc_gain_' + year + '_' + m.selectedSource.lastYear).clip(ftc0);
        var lyrGains = ui.Map.Layer(imgGains.visualize(m.lv.lcTransitions.vis), {}, m.labels.lblGains, c.lp.tr.pnlLayers.widgets().get(2).widgets().get(0).getValue());
        c.cp.map.layers().set(m.namesLayers.indexOf(m.labels.lblGains), lyrGains);

        var imgLosses = m.selectedSource.imgTransitions.select('lc_loss_' + year + '_' + m.selectedSource.lastYear).clip(ftc0);
        var lyrLosses = ui.Map.Layer(imgLosses.visualize(m.lv.lcTransitions.vis), {}, m.labels.lblLosses, c.lp.tr.pnlLayers.widgets().get(3).widgets().get(0).getValue());
        c.cp.map.layers().set(m.namesLayers.indexOf(m.labels.lblLosses), lyrLosses);

        // Update transitions charts with new selected period                
        setupTransitionsCharts();
    };

    /** Updates start years list and final year according to @param source selected */
    c.lp.tr.selSources.onChange(function (source) {

        for (var i = 0; i < m.transitionsSources.length; i++) {
            if (m.transitionsSources[i].name === source) {
                m.selectedSource = m.transitionsSources[i];
                break;
            }
        }

        // Reset select with initial years for selected lc source                
        c.lp.tr.selLCFromYears.items().reset(m.selectedSource.initialYears);
        c.lp.tr.selLCFromYears.unlisten();
        c.lp.tr.selLCFromYears.setValue(m.selectedSource.yearsLC[0]); // by default select first year from inital years list
        resetTransitionsLayers(m.selectedSource.yearsLC[0]);

        c.lp.tr.selLCFromYears.onChange(function (year) {
            resetTransitionsLayers(year);
        });
    });

    /** Reload transitions layers for @param year selected */
    c.lp.tr.selLCFromYears.onChange(function (year) {
        resetTransitionsLayers(year);
    });

    /** Shows/Hides drawing tool panel and related chart panel */
    c.lp.dt.btnDrawingTools.onClick(function () {

        c.lp.dt.pnlContainer.style().set({ shown: !c.lp.dt.pnlContainer.style().get('shown') });

        if (!c.lp.dt.pnlContainer.style().get('shown')) {
            c.cp.map.drawingTools().stop();
        }
        else {
            c.lp.boundaries.selBoundariesLayer.setValue(m.labels.lblNone);
        }

        c.cp.map.drawingTools().setShown(c.lp.dt.pnlContainer.style().get('shown'));
        c.cp.map.drawingTools().layers().forEach(function (l) {
            l.setShown(c.lp.dt.pnlContainer.style().get('shown'));
        });
    });

    /** Creates a new layer with custom name in drawing tools */
    c.lp.dt.btnAddLayer.onClick(function () {
        var paletteLayers = ['#ffb6fc', '#b797ff', '#6a5c5c', '#b3d2b6', '#06ffee', '#b63cff', '#9efba8', '#ff4848', '#ffffff'];
        if (c.lp.dt.txbLayerName.getValue().trim() !== '') {
            var gmlNewLayer = ui.Map.GeometryLayer({
                geometries: null,
                name: c.lp.dt.txbLayerName.getValue(),
                color: paletteLayers[c.cp.map.drawingTools().layers().length() % paletteLayers.length]
            });
            c.cp.map.drawingTools().layers().add(gmlNewLayer);
            c.lp.dt.txbLayerName.setValue('');
        }
    });

    /** Selects Ecuador */
    c.cp.btnSelectContainer.onClick(function () {
        resetLevelsSelects();
        resetLUSSelect();
        m.levelAoi = m.labels.lblSelectContainer;
        m.ftcAoi = ftc0;
        m.precalculated = true;
        c.cp.map.centerObject(m.ftcAoi);
        showInfoSelectedAoi();
        clearCombinedLayerAndLegend();
    });

    /** Removes combined legend widget from map panel and resets combined image*/
    var clearCombinedLayerAndLegend = function () {
        c.cp.map.widgets().remove(c.cp.pnlCombinedLegend);
        c.cp.map.layers().set(m.namesLayers.indexOf(m.labels.lblHotspots), ui.Map.Layer(ee.Image(0).selfMask(), {}, m.labels.lblHotspots, false));
    };

    /** Disables or enables checks in hotspots panel, invoked from calculate and reset buttons */
    var handleDisableMcChecks = function (disable) {
        for (var p = 0; p < m.mcEntries.length; p++) {
            var widgetsArray = c.lp.mc.pnlEntries.widgets().get(p).widgets().getJsArray();
            for (var i = 1; i < widgetsArray.length; i++) { // 0=panel title
                widgetsArray[i].widgets().get(1).setDisabled(disable);
            }
        }
    };

    /** Function to enable/disable ui components that allows new aoi query */
    var handleEvaluating = function (disable) {

        c.lp.lan.selLanguage.setDisabled(disable);
        c.lp.levels.selLevel1.setDisabled(disable);
        c.lp.levels.selLevel2.setDisabled(disable);
        c.lp.levels.selLevelLUS.setDisabled(disable);

        c.lp.mc.btnReset.setDisabled(disable);
        c.lp.mc.btnCalculate.setDisabled(disable);
        handleDisableMcChecks(disable);

        c.lp.tr.selLCFromYears.setDisabled(disable);
        c.lp.tr.selSources.setDisabled(disable);

        c.lp.dt.btnZonalStats.setDisabled(disable);

        if (m.precalculated)
            c.rp.lblMessages.setValue(disable ? m.labels.lblProcessingArea : '');
        else
            c.rp.lblMessages.setValue(disable ? m.labels.lblProcessing : '');

        c.rp.pnlMessages.style().set({ shown: disable });

        c.cp.btnSelectContainer.setDisabled(disable);

    };

    c.cp.map.drawingTools().onSelect(function (geom, layer) {
        m.gmySelected = geom;
        m.selectedLayerName = layer.getName();

    });

    c.cp.map.drawingTools().onLayerSelect(function (layer) {
        if (layer === null) {
            m.gmySelected = undefined;
        }
    });

    /** If selected drawn-area is contained in region area and smaller than max area call showInfoSelectedAoi to
     * calculate on the fly stats.
     */
    c.lp.dt.btnZonalStats.onClick(function () {

        if (m.gmySelected === undefined) {
            c.rp.lblMessages.setValue(m.labels.lblSelectGeometry);
            c.rp.pnlMessages.style().set({ shown: true });
            return;
        }

        if (m.gmySelected.type().getInfo() === 'Point') {
            c.rp.lblMessages.setValue(m.labels.lblSelectArea);
            c.rp.pnlMessages.style().set({ shown: true });
            return;
        }

        var f = ee.Feature(m.gmySelected).set(
            'area_ha', m.gmySelected
                .area({ 'maxError': 1 })
                .divide(10000));
        f = f.set('name', 'Drawn-feature in ' + m.selectedLayerName);

        handleEvaluating(true);
        f.get('area_ha').evaluate(function (area, error) {
            if (error) {
                handleEvaluating(false);
                c.rp.lblMessages.setValue(m.labels.lblUnexpectedError + error);
                c.rp.pnlMessages.style().set({ shown: true });
                return;
            }

            if (area > m.maxAreaHa) {
                handleEvaluating(false);
                c.rp.lblMessages.setValue(m.labels.lblSmallerArea
                    + formatNumber(m.maxAreaHa, 0) + 'ha. '
                    + m.labels.lblSelectedAreaHa
                    + ' ' + formatNumber(area, 2) + 'ha.');
                c.rp.pnlMessages.style().set({ shown: true });
                return;
            }

            ftcADM0.geometry().contains(m.gmySelected, 1).evaluate(function (contained, error) {

                if (error) {
                    handleEvaluating(false);
                    c.rp.lblMessages.setValue(m.labels.lblUnexpectedError + error);
                    c.rp.pnlMessages.style().set({ shown: true });
                    return;
                }

                if (!contained) {
                    handleEvaluating(false);
                    c.rp.lblMessages.setValue(m.labels.lblGeometryNotContained);
                    c.rp.pnlMessages.style().set({ shown: true });
                    return;
                }

                m.ftcAoi = ee.FeatureCollection(f);
                m.precalculated = false;
                m.haAoi = area;
                m.levelAoi = m.labels.lblDrawingTools;
                showInfoSelectedAoi();
            });
        });
    });

    /** Creates chart and set it as a widget in @param chartPanel
     * @param chartDataTable
     * @param chartOptions
     * @param chartType
     * @param chartPanel
     * @param chartOnClick
    */
    var createChart = function (
        chartDataTable,
        chartOptions,
        chartType,
        chartPanel,
        chartOnClick
    ) {
        // Until chart is rendered, display 'Generating chart x' message
        chartPanel.widgets().set(0,
            ui.Label({
                value: m.labels.lblGeneratingCharts + ': ' + chartOptions.title + '...',
                style: s.styleMessage,
            })
        );

        // Add current evaluation to been procesed list
        m.evalSet[chartOptions.title] = true;
        chartDataTable.evaluate(function (dataTable, error) {
            delete m.evalSet[chartOptions.title];

            if (Object.keys(m.evalSet).length === 0) {
                handleEvaluating(false);
            }

            if (error) {
                chartPanel.widgets().get(0).setValue(m.labels.lblError + ':' + error);
                return;
            }

            var chart = ui
                .Chart(dataTable)
                .setChartType(chartType)
                .setOptions(chartOptions);

            if (typeof chartOnClick !== 'undefined') { chart.onClick(chartOnClick); }


            if (chartType === 'Table') {
                var header = dataTable[0];
                var cols = [];
                var suffixFinalYear = '';
                if (chartOptions.title === m.labels.lblTableLC) {
                    suffixFinalYear = '_' + chartOptions.final;
                }
                for (var c = 0; c < header.length; c++) {
                    cols.push(c === 0 ? ' ' + header[c].label : c + '_' + header[c].label + suffixFinalYear);
                }
                cols.push(header.length + '_Total');

                var list = ee.List([]);
                for (var index = 1; index < dataTable.length; index++) {// values
                    var element = dataTable[index];
                    var f = ee.Feature(null);
                    var rowTotal = 0;
                    for (var j = 0; j < element.length; j++) {
                        var value = element[j];
                        if (j === 0) {
                            value = value + '_' + chartOptions.initial;
                            f = f.set(cols[j], value);
                        }
                        else {
                            rowTotal = rowTotal + parseFloat(value);
                            f = f.set(cols[j], parseFloat(value));
                        }

                    }
                    f = f.set(header.length + '_Total', rowTotal);
                    list = list.add(f);
                }
                // new feature for columns totals
                var fSum = ee.Feature(null).set(cols[0], 'Total');
                var ftcList = ee.FeatureCollection(list);
                var sumColumns = ftcList.reduceColumns({
                    reducer: ee.Reducer.sum().repeat(cols.length - 1),
                    selectors: cols.slice(1), // not first column (cat name)
                });
                sumColumns.get('sum').getInfo(
                    function (sumsList) {
                        for (c = 1; c < cols.length; c++) {
                            fSum = fSum.set(cols[c], sumsList[c - 1]);
                        }
                        list = list.add(fSum);
                        chartPanel.widgets().set(0, ui.Label(chartOptions.title, { margin: '40px 10px 10px 10px', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'pre' }));
                        chartPanel.widgets().set(1, chart);
                        chartPanel.widgets().set(2, ui.Label(m.labels.lblDownloadCsv, { fontSize: '12px' }).setUrl(ee.FeatureCollection(list).getDownloadURL({ format: 'CSV', filename: 'TableData', selectors: cols })));

                    }
                );
            }
            else {
                chartPanel.widgets().set(0, chart); // replace 'Generating...' label with chart
            }
        });
    };

    /** Setup general charts: LC, LPD, Hansen and Anual NDVI*/
    var setupGeneralCharts = function () {

        c.rp.charts.pnlGeneralCharts.clear();
        c.rp.charts.pnlGeneralCharts.add(c.rp.charts.lblGeneralChartsTitle);

        // If custom drawn-area calculate required statistics for charts
        var ftc = m.precalculated ? m.ftcAoi : mdlPrecalculation.precalculate(m.ftcAoi, ['lc', 'lpd', 'hansen', 'ndviAnnual', 'x2']);

        //  LAND COVER PIE CHART
        var lstFeatLC = mdlPrecalculation.namesLCColumns.map(function (pName, i) {
            var lstValues = ee.List([m.lv.lc.names[i], ftc.first().get(pName)]);
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderLC = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: 'Value', role: 'data', type: 'number' },
            ],
        ]);

        var optionsLC = {
            title: m.labels.lblLandCover + ' ' + m.defaultFinalLCYear,
            height: 350,
            legend: { position: 'top', maxLines: 1 },
            colors: m.lv.lc.vis.palette,
            pieHole: 0.4
        };
        createChart(lstHeaderLC.cat(ee.FeatureCollection(lstFeatLC).aggregate_array('row')), optionsLC, 'PieChart', createChartPanel(c.rp.charts.pnlGeneralCharts));


        //  LPD PIE CHART       
        var lstFeatLPD = mdlPrecalculation.namesLPDColumns.slice(1).map(function (pName, i) { // slice(1)=lpd_0
            var lstValues = ee.List([m.lv.lpd.names[i + 1], ftc.first().get(pName)]);
            return ee.Feature(null, { row: lstValues });
        });
        var lstHeaderLPD = ee.List([
            [
                { label: 'LPD', role: 'domain', type: 'string' },
                { label: 'Value', role: 'data', type: 'number' },
            ],
        ]);

        var optionsLPD = {
            title: m.labels.lblLandProductivityDynamics,
            height: 350,
            legend: { position: 'top', maxLines: 1 },
            colors: m.lv.lpd.vis.palette.slice(1),
        };

        createChart(lstHeaderLPD.cat(ee.FeatureCollection(lstFeatLPD).aggregate_array('row')), optionsLPD, 'PieChart', createChartPanel(c.rp.charts.pnlGeneralCharts));

        // HANSEN Forest loss
        var lstFeatForestLossByYear = mdlPrecalculation.yearsHansen.map(function (i) {
            var v = ftc.first().get('hansen_' + (2000 + i));
            var lstValues = ee.List([(2000 + i), v]);
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderForesLossByYear = ee.List([
            [
                { label: 'Year', role: 'domain', type: 'string' },
                { label: 'Ha', role: 'data', type: 'number' },
            ],
        ]);

        var optionsForestLossByLC = {
            title: m.labels.lblDeforestation,
            legend: { position: 'none' },
        };
        createChart(lstHeaderForesLossByYear.cat(ee.FeatureCollection(lstFeatForestLossByYear).aggregate_array('row')), optionsForestLossByLC, 'ColumnChart', createChartPanel(c.rp.charts.pnlGeneralCharts));


        // NDVI ANNUAL
        var lstNdviByYear = mdlPrecalculation.yearsHansen.map(function (i) {
            var v = ftc.first().get('ndvi_' + (2000 + i));
            var lstValues = ee.List([(2000 + i), v]);
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderNdviByYear = ee.List([
            [
                { label: 'Year', role: 'domain', type: 'number' },
                { label: 'NDVI Annual Mean', role: 'data', type: 'number' },

            ],
        ]);

        var optionsNdviByYear = {
            title: m.labels.lblAnnualNDVI,
            legend: { position: 'none' },
            vAxis: { title: 'NDVI x 10000' },
            hAxis: { title: m.labels.lblYear, format: '####', gridlines: { count: 7 } },
        };
        createChart(lstHeaderNdviByYear.cat(ee.FeatureCollection(lstNdviByYear).aggregate_array('row')), optionsNdviByYear, 'LineChart', createChartPanel(c.rp.charts.pnlGeneralCharts));


        // NDVI MENSUAL, for user-drawn features     
        if (!m.precalculated) {
            var chtNdviByMonthYear = ui.Chart.image.series(imcNDVIByMonthYear, ftc, ee.Reducer.mean(), 250);
            chtNdviByMonthYear.setOptions({
                title: m.labels.lblMonthlyNDVI,
                vAxis: { title: 'NDVI x 10000' },
                hAxis: { title: m.labels.lblCalendarYear, format: 'yyyy', gridlines: { count: 7 } },
            });

            createChartPanel(c.rp.charts.pnlGeneralCharts).add(chtNdviByMonthYear);
        }
    };

    /** Setup combined charts: LPDxLC, SOCxLPD, SOCxLC, SOCxLPDxLC, LCxLPD table*/
    var setupMcCharts = function () {
        c.rp.charts.pnlMcCharts.clear();
        c.rp.charts.pnlMcCharts.add(c.rp.charts.lblMcChartsTitle);


        // If custom drawn-area calculate required statistics for charts
        var ftc = m.precalculated ? m.ftcAoi : mdlPrecalculation.precalculate(m.ftcAoi, ['x2', 'soc_lpd', 'soc_lc', 'soc_lc_lpd']);

        var catsLCNoWater = [1, 2, 3, 4, 5, 6, 7];
        var catsLPD = [1, 2, 3, 4, 5];


        //  COMBINED 1: LPD BY LAND COVER
        var handleClickFromChart = function (xValue, yValue, seriesName) {

            clearCombinedLayerAndLegend();

            if (xValue) { // lpdxlc

                var catLC = m.lv.lc.names.indexOf(xValue) + 1;
                var catLPD = m.lv.lpd.names.indexOf(seriesName); // 0-non veg

                var catCombined = parseInt('' + catLC + catLPD);
                var imgSelection = a.imgCombinedx2.clip(ftc).eq(catCombined).selfMask();

                var legendTitle = 'From chart: ' + m.labels.lblCombinedCategoriesArea + ' ' + formatNumber(yValue, 2) + ' ha.';
                var legendText = 'LC: ' + xValue + ' - LPD: ' + seriesName;

                // Reset selection from Multicriteria Analysis panel 
                handleClickReset();

                // Create and show combined layer and legend
                setupCombinedLayer(imgSelection, legendTitle, legendText, true);
            }
        };


        var lstFeatCombinedLC = catsLCNoWater.map(function (i) {
            var v1 = ftc.first().get(i + '_1');
            var v2 = ftc.first().get(i + '_2');
            var v3 = ftc.first().get(i + '_3');
            var v4 = ftc.first().get(i + '_4');
            var v5 = ftc.first().get(i + '_5');

            var lstValues = ee.List([m.lv.lc.names[i - 1], v1, v2, v3, v4, v5]);

            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderC1 = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: m.lv.lpd.names[1], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[2], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[3], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[4], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[5], role: 'data', type: 'number' },
            ],
        ]);


        // Relative
        var optionsC1Rel = {
            title: m.labels.lblLPDperLC,
            width: 600,
            height: 400,
            legend: { position: 'top', maxLines: 3 },
            bar: { groupWidth: '75%' },
            isStacked: 'relative',
            colors: m.lv.lpd.vis.palette.slice(1),
        };
        createChart(lstHeaderC1.cat(ee.FeatureCollection(lstFeatCombinedLC).aggregate_array('row')), optionsC1Rel, 'BarChart', createChartPanel(c.rp.charts.pnlMcCharts), handleClickFromChart);

        //  SOC by LPD
        var lstFeatSOCbyLPD = catsLPD.map(function (i) {
            var mean = ftc.first().get('soc_mean_lpd_' + i);
            var lstValues = ee.List([m.lv.lpd.names[i], mean, m.lv.lpd.vis.palette[i]]); // palette has non vegetated color entry
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderSOCbyLPD = ee.List([
            [
                { label: 'LPD', role: 'domain', type: 'string' },
                { label: 'SOC mean', role: 'data', type: 'number' },
                { label: 'color', role: 'style', type: 'string' },
            ],
        ]);

        var optionsSOCbyLPD = {
            title: m.labels.lblSOCperLPD,
            legend: { position: 'none' },
        };
        createChart(lstHeaderSOCbyLPD.cat(ee.FeatureCollection(lstFeatSOCbyLPD).aggregate_array('row')), optionsSOCbyLPD, 'ColumnChart', createChartPanel(c.rp.charts.pnlMcCharts));

        //SOC by LC        
        var lstFeatSOCbyLC = catsLCNoWater.map(function (i) {
            var mean = ftc.first().get('soc_mean_lc_' + i);
            var lstValues = ee.List([m.lv.lc.names[i - 1], mean, m.lv.lc.vis.palette[i - 1]]);
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderSOCbyLC = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: 'SOC mean', role: 'data', type: 'number' },
                { label: 'color', role: 'style', type: 'string' },
            ],
        ]);

        var optionsSOCbyLC = {
            title: m.labels.lblSOCperLC,
            legend: { position: 'none' },
        };
        createChart(lstHeaderSOCbyLC.cat(ee.FeatureCollection(lstFeatSOCbyLC).aggregate_array('row')), optionsSOCbyLC, 'ColumnChart', createChartPanel(c.rp.charts.pnlMcCharts));

        // SOC combochart
        var lstFeatComboChart = catsLCNoWater.map(function (i) {
            var v1 = ftc.first().get('soc_mean_lc_' + i + '_lpd_1');
            var v2 = ftc.first().get('soc_mean_lc_' + i + '_lpd_2');
            var v3 = ftc.first().get('soc_mean_lc_' + i + '_lpd_3');
            var v4 = ftc.first().get('soc_mean_lc_' + i + '_lpd_4');
            var v5 = ftc.first().get('soc_mean_lc_' + i + '_lpd_5');
            var l = ee.List([v1, v2, v3, v4, v5]);

            var mean = ee.Number(l.reduce(ee.Reducer.sum())).divide(5);
            var lstValues = ee.List([m.lv.lc.names[i - 1], v1, v2, v3, v4, v5, mean]);

            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderComboChart = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: m.lv.lpd.names[1], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[2], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[3], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[4], role: 'data', type: 'number' },
                { label: m.lv.lpd.names[5], role: 'data', type: 'number' },
                { label: 'SOC mean per LC', role: 'data', type: 'number' },
            ],
        ]);
        var optionsComboChart = {
            title: m.labels.lblSOCperLCLPD,
            width: 600,
            height: 400,
            legend: { position: 'top' },
            seriesType: 'bars',
            colors: m.lv.lpd.vis.palette.slice(1),
            series: { 5: { type: 'line', color: 'blue' } },
        };

        createChart(lstHeaderComboChart.cat(ee.FeatureCollection(lstFeatComboChart).aggregate_array('row')), optionsComboChart, 'ColumnChart', createChartPanel(c.rp.charts.pnlMcCharts));

        // Table with LPD ha per LC
        var lstFeatLCLPDTable = catsLCNoWater.map(function (i) {
            var values = catsLPD.map(function (c) {
                return ee.Number(ftc.first().get(i + '_' + c)).format('%.2f');
            });
            var lstValues = ee.List([m.lv.lc.names[i - 1]]).cat(values);
            return ee.Feature(null, { row: lstValues });
        });

        var colsT2 = [{ label: m.labels.lblLC + m.defaultFinalLCYear + '/' + m.labels.lblLPD, role: 'domain', type: 'string' }];
        m.lv.lpd.names.slice(1).forEach(function (lpd) {
            colsT2.push({ label: lpd, role: 'data', type: 'number' });
        });
        var lstHeaderLCLPDTable = ee.List([colsT2]);

        var optionsLCTLPDTable = {
            title: m.labels.lblTableLCLPD,
            initial: m.defaultFinalLCYear,
            final: m.defaultFinalLCYear,
            html: true,
            frozenColumns: 1,

        };

        createChart(lstHeaderLCLPDTable.cat(ee.FeatureCollection(lstFeatLCLPDTable).aggregate_array('row')), optionsLCTLPDTable, 'Table', createChartPanel(c.rp.charts.pnlMcCharts));
    };

    /** Setup transition charts, according to source and year selected in transition panel: LC comparison, LC net changes, LCxLC table*/
    var setupTransitionsCharts = function () {

        c.rp.charts.pnlTransitionsCharts.clear();
        c.rp.charts.lblTransitionsChartsTitle.setValue(m.labels.lblTransitionsCharts + ' - ' + m.selectedSource.name);
        c.rp.charts.pnlTransitionsCharts.add(c.rp.charts.lblTransitionsChartsTitle);

        var catsLC = [1, 2, 3, 4, 5, 6, 7, 8];
        var fromYear = c.lp.tr.selLCFromYears.getValue();

        // If custom drawn-area calculate required statistics for charts
        var ftc = m.precalculated ? m.ftcAoi : mdlPrecalculation.precalculate(m.ftcAoi, [
            'lc_' + fromYear + '_' + m.selectedSource.initials,
            'lc_' + m.selectedSource.lastYear + '_' + m.selectedSource.initials,
            'lc_trans_' + m.selectedSource.initials + '_' + fromYear + '_' + m.selectedSource.lastYear]);


        // chartTrans1 Comparison column chart LC
        var lstFeatLCCombo = mdlPrecalculation.namesLCColumns.map(function (pName, i) {
            var initialValue = ftc.first().get(pName + '_' + fromYear + '_' + m.selectedSource.initials);
            var finalValue = ftc.first().get(pName + '_' + m.selectedSource.lastYear + '_' + m.selectedSource.initials);
            var s = 'bar {fill-color:' + m.lv.lc.vis.palette[i] + '; stroke-width: 0.5; stroke-color: #000000}';
            var lstValues = ee.List([m.lv.lc.names[i], initialValue, s, finalValue, s]);

            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderLCCombo = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: fromYear, role: 'data', type: 'number' },
                { label: 'color1', role: 'style', type: 'string' },
                { label: m.selectedSource.lastYear, role: 'data', type: 'number' },
                { label: 'color2', role: 'style', type: 'string' },
            ],
        ]);
        var optionsLCCombo = {
            title: m.labels.lblLCPieChartChange + ' ' + fromYear + ' - ' + m.selectedSource.lastYear,
            width: 600,
            height: 400,
            legend: { position: 'none' },
            seriesType: 'bars',
        };

        createChart(lstHeaderLCCombo.cat(ee.FeatureCollection(lstFeatLCCombo).aggregate_array('row')), optionsLCCombo, 'ColumnChart', createChartPanel(c.rp.charts.pnlTransitionsCharts));


        // charTrans2 LC CANDLESTICK NET GAIN/LOSS CHART
        var lstFeatLCNetChange = mdlPrecalculation.namesLCColumns.map(function (pName, i) {
            var initialValue = ftc.first().get(pName + '_' + fromYear + '_' + m.selectedSource.initials);
            var finalValue = ftc.first().get(pName + '_' + m.selectedSource.lastYear + '_' + m.selectedSource.initials);
            var diff = ee.Number(finalValue).subtract(ee.Number(initialValue)).format('%,.2f');
            var tt = ee.String(m.labels.lblDifference + ' (ha): ').cat(diff);
            var lstValues = ee.List([m.lv.lc.names[i], initialValue, initialValue, finalValue, finalValue, tt]);
            return ee.Feature(null, { row: lstValues });
        });

        var lstHeaderLCNetChange = ee.List([
            [
                { label: 'LC', role: 'domain', type: 'string' },
                { label: 'Low', role: 'data', type: 'number' },
                { label: 'Open', role: 'data', type: 'number' },
                { label: 'Close', role: 'data', type: 'number' },
                { label: 'Final', role: 'data', type: 'number' },
                { role: 'tooltip', p: { html: true } }
            ],
        ]);

        var optionsLCNetChange = {
            title: m.labels.lblNetLCChanges + ' ' + fromYear + ' - ' + m.selectedSource.lastYear,
            legend: { position: 'none' },
            bar: { groupWidth: '100%' },
            candlestick: {
                fallingColor: { strokeWidth: 0, fill: '#a52714' }, // red
                risingColor: { strokeWidth: 0, fill: '#0f9d58' }   // green
            }
        };

        createChart(lstHeaderLCNetChange.cat(ee.FeatureCollection(lstFeatLCNetChange).aggregate_array('row')), optionsLCNetChange, 'CandlestickChart', createChartPanel(c.rp.charts.pnlTransitionsCharts));


        // chartTrans3 Table with transitions LC/LC
        var lstFeatLCTransTable = catsLC.map(function (i) {
            var transition = 'lc_trans_' + m.selectedSource.initials + '_' + fromYear + '_' + m.selectedSource.lastYear + '_' + i;

            var values = catsLC.map(function (c) {
                return ee.Number(ftc.first().get(transition + '_' + c)).format('%.2f');
            });
            var lstValues = ee.List([m.lv.lc.names[i - 1]]).cat(values);
            return ee.Feature(null, { row: lstValues });
        });



        var colsT1 = [{ label: fromYear + '/' + m.selectedSource.lastYear, role: 'domain', type: 'string' }];
        m.lv.lc.names.forEach(function (lc) {
            colsT1.push({ label: lc, role: 'data', type: 'number' });
        });
        var lstHeaderLCTransTable = ee.List([colsT1]);

        var optionsLCTransTable = {
            title: m.labels.lblTableLC,
            initial: fromYear,
            final: m.selectedSource.lastYear,
            html: true,
            frozenColumns: 1,

        };

        createChart(lstHeaderLCTransTable.cat(ee.FeatureCollection(lstFeatLCTransTable).aggregate_array('row')), optionsLCTransTable, 'Table', createChartPanel(c.rp.charts.pnlTransitionsCharts));

    };

    /** Creates combined layer from image adding legend to map panel, invoked from calculateMultiCriteria() and combined chart click */
    var setupCombinedLayer = function (image, legendTitle, legendText, fromChart) {

        c.cp.pnlCombinedLegend = ui.Panel();

        if (fromChart) { // if invoked from chart add checkbox to show/hide layer
            var chbCombined = ui.Checkbox(legendTitle, true, null, false, { margin: '1px 0px', fontSize: '12px', fontWeight: 'bold' });
            chbCombined.onChange(function (checked) {
                showLayer(m.labels.lblHotspots, checked);
            });
            c.cp.pnlCombinedLegend.add(chbCombined);
        }
        else {
            c.cp.pnlCombinedLegend.add(ui.Label(legendTitle, { margin: '1px 0px', fontSize: '12px', fontWeight: 'bold' }));
        }

        c.cp.pnlCombinedLegend.add(mdlLegends.createCatRow(m.lv.custom.vis.palette[0], legendText, false));
        c.cp.pnlCombinedLegend.style().set({
            position: 'bottom-center'
        });

        var lblDownloadText = ui.Label({
            style: {
                fontSize: '12px',
                margin: '1px 1px 4px 1px',
                padding: '2px',
            },
        });
        c.cp.pnlCombinedLegend.add(lblDownloadText);

        if (image !== null) {
            var options = { region: m.ftcAoi.geometry(), name: legendText };
            image.getDownloadURL(options, function (url) {
                // error ie: Pixel grid dimensions x must be less than or equal to 10000.
                lblDownloadText.setValue(m.labels.lblGeneratingDownloadLink);

                if (url !== null) {
                    lblDownloadText.setValue(m.labels.lblDownload);
                    lblDownloadText.setUrl(url);
                }
                else {
                    lblDownloadText.setValue('');
                }

            });
        }

        // Combined layer is always generated but only shown if hotspots panel is opened 
        var showLyrCombined = true;
        if (!fromChart && !c.lp.mc.pnlContainer.style().get('shown')) {

            // hide legend and map
            c.cp.pnlCombinedLegend.style().set({
                shown: false,
            });
            showLyrCombined = false;
        }

        c.cp.map.setOptions('SATELLITE');
        c.cp.map.widgets().add(c.cp.pnlCombinedLegend);

        c.cp.map.layers().set(m.namesLayers.indexOf(m.labels.lblHotspots), ui.Map.Layer(image, m.lv.custom.vis, m.labels.lblHotspots, showLyrCombined));

    };

    /** Creates a new image layer and calculate area considering categories selected in multicriteria panel*/
    var calculateMultiCriteria = function () {
        c.rp.lblMessages.setValue(m.labels.lblProcessingArea);
        c.rp.pnlMessages.style().set({ shown: true });

        handleEvaluating(true);
       
        var totalArea = 0;
        var statsAreaBE;

        a.imgCustom = ee.Image(0).selfMask();

        // Function to calculate total area from precalculated asset
        var getSumAreas = function (categories, prefix, posfix, ftc) {
            var sum = ee.Number(0);
            categories.forEach(function (c) {
                sum = sum.add(ftc.first().get(prefix + c + posfix));
            });
            return sum;
        };

        // Function to filter image with categories 
        var getFilteredImage = function (image, categories) {
            var imgFiltered = image.clip(m.ftcAoi).eq(parseInt(categories[0]));
            for (var i = 1; i < categories.length; i++) {
                imgFiltered = imgFiltered.or(image.eq(parseInt(categories[i])));
            }
            return imgFiltered.selfMask();
        };


        // Foreach section panel in hotspots panel check which categories are selected
        var selectedPerSection = [];
        var filteredImages = [];
        var advancedMode = c.lp.mc.selMcOptions.getValue() === m.labels.lblMcAdvanced ? true : false;


        c.lp.mc.pnlEntries.widgets().forEach(function (panel, panelIndex) {
            if (panelIndex < m.mcEntries.length) {
                var selectedCatNumbers = [];
                panel.widgets().forEach(function (element, index) {
                    if (index > 0) { // title
                        if (element.widgets().get(1).getValue()) {
                            var pidx = m.mcEntries[panelIndex].names.indexOf(element.widgets().get(1).getLabel());
                            selectedCatNumbers.push(m.mcEntries[panelIndex].categories[pidx]);
                        }
                    }
                });
                selectedPerSection.push(selectedCatNumbers);

                if (advancedMode) {
                    if (selectedCatNumbers.length > 0) {
                        // add filtered image to array 
                        filteredImages.push(getFilteredImage(m.mcEntries[panelIndex].image, selectedCatNumbers));
                    }
                }

            }
        });

        if (advancedMode) {
            var imgProduct = ee.Image(1).clip(m.ftcAoi);

            filteredImages.forEach(function (f, i) {
                imgProduct = imgProduct.multiply(f);
            });

            a.imgCustom = imgProduct;

            // Calculate only selected categories
            var imgCombinedCatAreaAdv = a.imgCustom.eq(1)
                .rename('area')
                .multiply(ee.Image.pixelArea()).divide(10000);

            var be = m.levelAoi === m.labels.lblSelectContainer ? true : false;
            var statsAreaAdv = imgCombinedCatAreaAdv.reduceRegion({
                reducer: ee.Reducer.sum(),
                geometry: m.ftcAoi.first().geometry(),
                scale: 100,
                bestEffort: be
            });
            totalArea = statsAreaAdv.get('area');

            statsAreaBE = imgCombinedCatAreaAdv.reduceRegion({
                reducer: ee.Reducer.sum(),
                geometry: m.ftcAoi.first().geometry(),
                scale: 100,
                bestEffort: true
            });

        }
        else {
            // Check if combined or single image will be used: if categories from more than one section are selected then combined image will be used
            // if returns -1 use combined image, else use single image in index=sectionIndex;
            var sectionIndex = -1;
            for (var index = 0; index < selectedPerSection.length; index++) {
                if (selectedPerSection[index].length > 0) {
                    if (sectionIndex === -1) {
                        sectionIndex = index;
                    }
                    else {
                        sectionIndex = -1;// categories from more than one section selected, use combined image
                        break;
                    }
                }
            }

            if (sectionIndex === -1) {
                // Use combined image x4
                var catNumbers = [];
                var combinedCatNames = [];
                var aux = [];

                // check empty section
                selectedPerSection.forEach(function (a, i) {
                    if (a.length > 0) { // add selected categories in section
                        aux.push(a);
                    }
                    else {// none category selected so use all categories for section
                        var all = m.mcEntries[i].categories.slice(0);
                        if (m.mcEntries[i].noDataCategory) { // if img has no data pixels add 0 cat
                            all.push(0);
                        }
                        aux.push(all);
                    }
                });

                //print('aux: ', aux);
                // i.e aux [[2],[0,1,2,3,4,5],[1],[1]]
                var combineCategories = function (aux, sectionIndex, concat) {
                    aux[sectionIndex].forEach(function (element) {
                        if (sectionIndex === aux.length - 1) {
                            combinedCatNames.push(concat + '_' + element);
                        }
                        else {
                            combineCategories(aux, sectionIndex + 1, concat + (sectionIndex === 0 ? '' : '_') + element);
                        }
                    });
                };

                combineCategories(aux, 0, '');

                // remove '_' for raster categories query
                combinedCatNames.forEach(function (c) {
                    catNumbers.push(c.replace(/_/g, ''));
                });

                // Calculate image filtered with categories selected
                a.imgCustom = getFilteredImage(a.imgCombinedx2, catNumbers);

                if (m.precalculated) {
                    // For area calulation setup precalculated area columns names
                    totalArea = getSumAreas(combinedCatNames, '', '', m.ftcAoi);
                }
                else {
                    // It is not precalculated so calculate area for selected categories in x4
                    var imgCombinedCatArea = a.imgCustom.eq(1)
                        .rename('area')
                        .multiply(ee.Image.pixelArea()).divide(10000);

                    var statsArea = imgCombinedCatArea.reduceRegion({
                        reducer: ee.Reducer.sum(),
                        geometry: m.ftcAoi.first().geometry(),
                        scale: 50,
                    });
                    totalArea = statsArea.get('area');

                    statsAreaBE = imgCombinedCatArea.reduceRegion({
                        reducer: ee.Reducer.sum(),
                        geometry: m.ftcAoi.first().geometry(),
                        scale: 50,
                        bestEffort: true
                    });
                }
            }
            else {
                // Calculate raster and area with single image
                a.imgCustom = getFilteredImage(m.mcEntries[sectionIndex].image, selectedPerSection[sectionIndex]);
                // For area calulation setup precalculated area columns names
                var ftcSingle = m.precalculated ? m.ftcAoi : mdlPrecalculation.precalculate(m.ftcAoi, [m.mcEntries[sectionIndex].precalName]);
                totalArea = getSumAreas(selectedPerSection[sectionIndex], m.mcEntries[sectionIndex].prefix, m.mcEntries[sectionIndex].sufix, ftcSingle);
            }
        }

        // Compute area sum, when ready set title with total ha and try to create url to download image
        m.evalSet['multicriteria'] = true;
        totalArea.evaluate(function (t, error) {
            var legendTitle;
            if (error) {
                // Try with bestEffort=true            
                statsAreaBE.get('area').evaluate(function (t, error) {
                    delete m.evalSet['multicriteria'];
                    if (Object.keys(m.evalSet).length === 0) {
                        handleEvaluating(false);
                    }
                    if (error) {
                        legendTitle = m.labels.lblErrorCalculating;
                    }
                    else {
                        legendTitle = m.labels.lblHotspots + ' ~ ' + formatNumber(t, 2) + ' ha.';
                    }
                    setupCombinedLayer(t === 0 ? null : a.imgCustom, legendTitle, m.labels.lblCombinedCategoriesArea, false);
                });
            }
            else {
                delete m.evalSet['multicriteria'];
                if (Object.keys(m.evalSet).length === 0) {
                    handleEvaluating(false);
                }
                legendTitle = m.labels.lblHotspots + (m.levelAoi === m.labels.lblSelectContainer ? ' ~ ' : ' ') + formatNumber(t, 2) + ' ha.';
                setupCombinedLayer(t === 0 ? null : a.imgCustom, legendTitle, m.labels.lblCombinedCategoriesArea, false);
            }
        });
    }


    /** Returns true if at least one category in hotspots is checked*/
    var mcCategoryChecked = function () {
        for (var p = 0; p < m.mcEntries.length; p++) {
            var widgetsArray = c.lp.mc.pnlEntries.widgets().get(p).widgets().getJsArray();
            for (var i = 1; i < widgetsArray.length; i++) { // 0=panel title
                if (widgetsArray[i].widgets().get(1).getValue()) { // 0=colorbox 1=chkbox
                    return true;
                }
            }
        }
        return false;
    };


    /** Reset calcultation and uncheck all multicriteria categories*/
    var handleClickReset = function () {
        clearCombinedLayerAndLegend();
        // unselect combined checks
        for (var p = 0; p < m.mcEntries.length; p++) {
            var widgetsArray = c.lp.mc.pnlEntries.widgets().get(p).widgets().getJsArray();
            for (var i = 1; i < widgetsArray.length; i++) { // 0=title
                widgetsArray[i].widgets().get(1).setValue(false);
            }
        }
        c.lp.op.sldOpacity.setValue(1);
    };

    /** Recalculate combined layer with selected multicriteria categories */
    c.lp.mc.btnCalculate.onClick(function () {
        clearCombinedLayerAndLegend();
        if (mcCategoryChecked()) {
            calculateMultiCriteria();
            c.lp.op.sldOpacity.setValue(1);
        }
    });
    c.lp.mc.btnReset.onClick(handleClickReset);

    // Layers names array ordered as stacked in the map
    c.cp.map.layers().forEach(function (l) {
        m.namesLayers.push(l.getName());
    });


    /** Updates .csv and .json download links with drawn features*/
    var updateCollection = function () {
        var names = [];
        c.cp.map.drawingTools().layers().forEach(function (l) { return names.push(l.getName()) });

        var ftcDrawn = c.cp.map.drawingTools().toFeatureCollection("layerId");

        ftcDrawn = ftcDrawn.map(function (f) {
            return f
                .set("layerName", ee.List(names).get(f.get("layerId")))
                .set("layerId", f.get("layerId"));
        });

        ftcDrawn.size().evaluate(function (size) {
            if (size > 0) {
                c.lp.dt.lblJson.style().set('shown', true);
                c.lp.dt.lblJson.setValue(m.labels.lblUpdating + '...').setUrl(null);
                c.lp.dt.lblKml.style().set('shown', true);
                c.lp.dt.lblKml.setValue(m.labels.lblUpdating + '...').setUrl(null);


                ftcDrawn.getDownloadURL({
                    format: 'kml',
                    filename: m.labels.lblDownloadFileName,
                    callback: function (url) {
                        c.lp.dt.lblKml.setValue('.kml').setUrl(url);
                        c.lp.dt.lblKml.setUrl(url);
                    },
                });
                ftcDrawn.getDownloadURL({
                    format: 'json',
                    filename: m.labels.lblDownloadFileName,
                    callback: function (url) {
                        c.lp.dt.lblJson.setValue('.json').setUrl(url);
                        c.lp.dt.lblJson.setUrl(url);
                    },
                });
            }
            else {
                c.lp.dt.lblJson.style().set({ shown: false });
                c.lp.dt.lblKml.style().set({ shown: false });
            }
        });
    };

    c.cp.map.drawingTools().onDraw(updateCollection);
    c.cp.map.drawingTools().onEdit(updateCollection);
    c.cp.map.drawingTools().onErase(updateCollection);

    /*******************************************************************************
    * 6-Initialization *
    ******************************************************************************/

    // Project areas of interest Level1/Level2 
    m.ftcLelvel1 = ftc1;// ftc1Project=ftc1.filterMetadata('Project', 'equals', 1);
    m.ftcLelvel2 = ftc2;
    m.ftcAoi = ftc0;
    m.levelAoi = m.labels.lblSelectContainer;
    m.haAoi = 0;
    m.precalculated = true;


    // Countries names for dropdown
    m.names1 = m.ftcLelvel1.aggregate_array('ADM1_NAME').getInfo();
    m.codes1 = m.ftcLelvel1.aggregate_array('ADM1_CODE').getInfo();
    m.siLevel1 = [];
    for (var i = 0; i < m.names1.length; i++) {
        m.siLevel1.push({
            label: m.names1[i],
            value: m.codes1[i]
        });
    }
    m.siLevel1.sort(sortByLabel);
    c.lp.levels.selLevel1.items().reset(m.siLevel1);

    // LUS names for dropdown
    m.siLUS = ftcLUS.aggregate_array('name').getInfo().sort();
    c.lp.levels.selLevelLUS.items().reset(m.siLUS);

    showInfoSelectedAoi(); // on load show info of whole country region
    showFrontLayerLegend(); // on load show the last selected general layer legend

    c.cp.map.drawingTools().setDrawModes(['point', 'polygon', 'rectangle']);
    c.cp.map.setControlVisibility(true, false, true, true, true, true, false);
}








