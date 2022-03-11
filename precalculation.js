var imgLPD = ee.Image("users/projectgeffao/World/LPD_world_2001_2020_World"),
    imgMountains = ee.Image("users/projectgeffao/World/k1classes"),
    imgHansen = ee.Image("UMD/hansen/global_forest_change_2020_v1_8"),
    ftcPA = ee.FeatureCollection("users/projectgeffao/Ecuador/ProtectedAreas_SNAP_Ecuador"),
    imgNdviAnnual = ee.Image("users/cesarnon/World/NDVI_AnnualMean_2001_2020_Ecuador"),
    imgSOC = ee.Image("users/projectgeffao/Ecuador/MA002_CARBONO_ORGANICO_SUELOS_v2");
    
// Transitions source
var sources = [
    {
        initials: 'NAT',
        name: 'NATIONAL',
        imgLcAll: ee.Image('users/projectgeffao/Ecuador/MapaCobertura_Todos_Nivel15_1990_2018'),
        yearsLC: ['1990', '2000', '2008', '2014', '2016', '2018'],
        initialYears: ['1990', '2000', '2008', '2014', '2016'],
        lastYear: '2018',
        imgTransitions: ee.Image('users/projectgeffao/Ecuador/MapaCobertura_Ecuador_Transitions_2018_L15'),
        imgCombinedx2: ee.Image('users/projectgeffao/Ecuador/MapaUso_L15_LC2018x10_plus_LPD2020'),
        scaleLC: 30,
        scalex2: 10,
    },
];

// Base LC: National
var baseLCSource = sources[0];
var defaultFinalLCYear = baseLCSource.lastYear;
var imgLastLC = baseLCSource.imgLcAll.select('y' + defaultFinalLCYear);

// Protected Areas SNAP
var imgPA = ftcPA.reduceToImage(['id'], ee.Reducer.first()).gte(0).reproject('EPSG:4326', null, 30);
var imgPACat = imgPA.unmask().eq([0, 1])
    .rename(['cero', 'pa_ha'])
    .multiply(ee.Image.pixelArea()).divide(10000);

// KBA Yes/No
//var imgKBABin = ee.Image('users/projectgeffao/World/KBA_image_Bin_30m_World');
var imgKBABin = ee.Image('users/projectgeffao/Ecuador/KBA_Ecuador');
var imgKBABinCat = imgKBABin.eq([0, 1])
    .rename(['kba_bin_0', 'kba_bin_1'])
    .multiply(ee.Image.pixelArea()).divide(10000);


// Hansen Forest Loss
var yearsHansen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
var namesHansen = yearsHansen.map(function (y) { return 'hansen_' + (2000 + y); });
var imgHansenLoss = imgHansen.select('lossyear').selfMask();
var imgHansenLossCat = imgHansenLoss.eq(yearsHansen)
    .rename(namesHansen)
    .multiply(ee.Image.pixelArea()).divide(10000);

// Mountain Yes/No
var imgMountainBin = imgMountains.gte(1).unmask();
var imgMountainBinCat = imgMountainBin.eq([0, 1])
    .rename(['mountain_bin_0', 'mountain_bin_1'])
    .multiply(ee.Image.pixelArea()).divide(10000);

// LPD 5 cat + 0
var namesLPD = ['lpd_0', 'lpd_1', 'lpd_2', 'lpd_3', 'lpd_4', 'lpd_5',];
var imgLPDCat = imgLPD.unmask().eq([0, 1, 2, 3, 4, 5])
    .rename(namesLPD)
    .multiply(ee.Image.pixelArea()).divide(10000);

// LC default (Copernicus)
var namesLC = ['lc_1', 'lc_2', 'lc_3', 'lc_4', 'lc_5', 'lc_6', 'lc_7', 'lc_8'];
var imgLCCat = imgLastLC.eq([1, 2, 3, 4, 5, 6, 7, 8])
    .rename(namesLC)
    .multiply(ee.Image.pixelArea()).divide(10000);


// SOC ToDo cambiar a SOC nacional
var renamedSOC = imgSOC.eq(0).rename('cero').addBands(imgSOC.rename('soc'));
// SOC Stock in t/ha
var socMask = imgSOC.unmask().gte(0)
var socArea = socMask.multiply(ee.Image.pixelArea()).divide(10000);
var socStock = imgSOC.eq(0).rename('cero').addBands(imgSOC.multiply(socArea).rename('soc_sum'))

// CombinedX2: LC 1-8 X LPD 0-5
var combinedx2Strings = [];
var combinedx2Numbers = [];
for (var i = 1; i <= 8; i++) {
    for (var j = 0; j <= 5; j++) {
        combinedx2Numbers.push(parseInt('' + i + j));
        combinedx2Strings.push(i + '_' + j);
    }
}
var imgCombinedx2Cat = baseLCSource.imgCombinedx2.eq(combinedx2Numbers)
    .rename(combinedx2Strings)
    .multiply(ee.Image.pixelArea()).divide(10000);


// Reducers: each object in the list is an image reducer configuration available
var processList = [
    { name: 'lpd', image: imgLPDCat, reducer: ee.Reducer.sum(), scale: 250, },
    { name: 'lc', image: imgLCCat, reducer: ee.Reducer.sum(), scale: baseLCSource.scaleLC, },
    { name: 'x2', image: imgCombinedx2Cat, reducer: ee.Reducer.sum(), scale: baseLCSource.scalex2, },
    { name: 'soc_sum', image: socStock, reducer: ee.Reducer.sum(), scale: 1000, },
    { name: 'soc_min', image: renamedSOC.rename(['cero', 'soc_min']), reducer: ee.Reducer.min(), scale: 1000, },
    { name: 'soc_max', image: renamedSOC.rename(['cero', 'soc_max']), reducer: ee.Reducer.max(), scale: 1000, },
    { name: 'soc_mean', image: renamedSOC.rename(['cero', 'soc_mean']), reducer: ee.Reducer.mean(), scale: 1000, },
    { name: 'pa', image: imgPACat, reducer: ee.Reducer.sum(), scale: 30, },
    { name: 'kba_bin', image: imgKBABinCat, reducer: ee.Reducer.sum(), scale: 30, },
    { name: 'mountain_bin', image: imgMountainBinCat, reducer: ee.Reducer.sum(), scale: 250, },
    { name: 'hansen', image: imgHansenLossCat, reducer: ee.Reducer.sum(), scale: 30, },
    { name: 'ndviAnnual', image: imgNdviAnnual, reducer: ee.Reducer.mean(), scale: 250, },
];


// For each product/year calculate lc area
var lcNumbers = [1, 2, 3, 4, 5, 6, 7, 8];
sources.forEach(function (source) {
    for (var j = 0; j < source.yearsLC.length; j++) {
        var namesLCYear = [];
        for (var i = 0; i < namesLC.length; i++) {
            namesLCYear.push(namesLC[i] + '_' + source.yearsLC[j] + '_' + source.initials);
        }
        var renamedLC = source.imgLcAll.select('y' + source.yearsLC[j]).eq(lcNumbers).rename(namesLCYear);
        var areaImageLC = renamedLC.multiply(ee.Image.pixelArea()).divide(10000);
        processList.push({ name: 'lc_' + source.yearsLC[j] + '_' + source.initials, image: areaImageLC, reducer: ee.Reducer.sum(), scale: source.scaleLC });
    }
});


// Add to process soc x lpd, column names will be soc_mean_lpd_x -> soc_mean_lpd_1
for (var i = 1; i <= 5; i++) {
    processList.push({ name: 'soc_lpd', image: renamedSOC.mask(imgLPD.eq(i)).rename(['cero', 'soc_mean_lpd_' + i]), reducer: ee.Reducer.mean(), scale: 250, });
}
// Add to process soc x lc, column names will be soc_mean_lc_x -> soc_mean_lc_3
for (var i = 1; i <= 8; i++) {
    processList.push({ name: 'soc_lc', image: renamedSOC.mask(imgLastLC.eq(i)).rename(['cero', 'soc_mean_lc_' + i]), reducer: ee.Reducer.mean(), scale: baseLCSource.scaleLC, });
}

// Add soc x lc x lpd, column names will be soc_mean_lc_x_lpd_y -> soc_mean_lc_1_lpd_2
for (var i = 1; i <= 8; i++) { // LC 1-8
    for (var j = 1; j <= 5; j++) { // LPD 1-5
        processList.push({
            name: 'soc_lc_lpd',
            image: renamedSOC.mask(imgLastLC.eq(i).mask(imgLPD.eq(j))).rename(['cero', 'soc_mean_lc_' + i + '_lpd_' + j]),
            reducer: ee.Reducer.mean(),
            scale: baseLCSource.scaleLC,
        });
    }
}

// Add to process lc transitions, 
// column names lc_trans_product_initialYear_finalYear_LCInitial_LCFinal -> lc_trans_esa_2000_2018_1_5
// for each period 64(8x8) columns will be added to the asset
sources.forEach(function (source) {
    var finalYearLC = source.lastYear;
    var initialYearsLC = source.initialYears;
    var imgTransitions = source.imgTransitions;

    for (var x = 0; x < initialYearsLC.length; x++) {
        var lcChangeLayerName = 'lc_change_' + initialYearsLC[x] + '_' + finalYearLC;
        var newPeriod = 'lc_trans_' + source.initials + '_' + initialYearsLC[x] + '_' + finalYearLC;
        var names = [];
        var values = [];
        for (var a = 1; a <= 8; a++) {
            for (var b = 1; b <= 8; b++) {
                values.push(a * 10 + b);
                names.push(newPeriod + '_' + a + '_' + b);
            }
        }
        var renamedImageLCChange = imgTransitions.select(lcChangeLayerName).eq(values).rename(names);
        var areaLCChange = renamedImageLCChange.multiply(ee.Image.pixelArea()).divide(10000);
        processList.push({ name: 'lc_trans_' + source.initials + '_' + initialYearsLC[x] + '_' + finalYearLC, image: areaLCChange, reducer: ee.Reducer.sum(), scale: source.scaleLC });
    }
});

// For all features in collection, precalculates area and process all tasks defined in processList
var precalculate = function (pFeatureCollection, pStats) {
    var stats = pFeatureCollection.map(function (f) {
        return f.set(
            'area_ha', f
                .geometry()
                .area({ 'maxError': 1 })
                .divide(10000)
        );
    });

    var image;
    for (var j = 0; j < processList.length; j++) {
        if (pStats === undefined || pStats.indexOf(processList[j].name) >= 0) {
            image = processList[j].image;
            stats = image.reduceRegions({
                reducer: processList[j].reducer,
                scale: processList[j].scale,
                collection: stats,
            });
        }
    }

    return stats;
};



// Exports to use in  app
exports.precalculate = precalculate;

exports.sources = sources;
exports.baseLCSource = baseLCSource;

exports.namesLPDColumns = namesLPD;
exports.namesLCColumns = namesLC;
exports.yearsHansen = yearsHansen;

exports.imgSOC = imgSOC;
exports.imgLPD = imgLPD;
exports.imgMountains = imgMountains;


