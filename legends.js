

exports.createColorRampLegendPanel = function (pTitle, pVis, pTextMin, pTextCenter, pTextMax) {

    var colorBar = ui.Thumbnail({
        image: ee.Image.pixelLonLat().select(0),
        params: {
            bbox: [0, 0, 1, 0.1],
            dimensions: "100x10",
            format: "png",
            min: 0,
            max: 1,
            palette: pVis.palette,
        },
        style: { stretch: "horizontal", margin: "0px 8px", maxHeight: "24px" },
    });

    // Allow use of labels instead of min/max values 
    if (typeof pTextMin === "undefined") { pTextMin = pVis.min; }
    if (typeof pTextCenter === "undefined") { pTextCenter = (pVis.min + pVis.max) / 2; }
    if (typeof pTextMax === "undefined") { pTextMax = pVis.max; }

    var colorBarLabels = ui.Panel({
        widgets: [
            ui.Label(pTextMin, { margin: "4px 8px" }),
            ui.Label(pTextCenter, {
                margin: "4px 8px",
                textAlign: "center",
                stretch: "horizontal",
            }),
            ui.Label(pTextMax, { margin: "4px 8px" }),
        ],
        layout: ui.Panel.Layout.flow("horizontal"),
    });

    var legendPanel = ui.Panel({
        widgets: [createLegendTitle(pTitle), colorBar, colorBarLabels],
    });

    return legendPanel;
}


exports.createDiscreteLegendPanel = function (pTitle, pNames, pPalette, pCheckFunction, pCircle) {
    var legendPanel = ui.Panel({
        style: {
            margin: "1px 1px",
        },
    });

    if (pTitle !== null) {
        legendPanel.add(createLegendTitle(pTitle));
    }
    for (var i = 0; i < pPalette.length; i++) {
        legendPanel.add(createCatRow(pPalette[i], pNames[i], pCheckFunction, pCircle));
    }

    return legendPanel;
}

function createLegendTitle(pTitle) {
    return ui.Label({
        value: pTitle,
        style: {
            fontWeight: "bold",
            fontSize: "12px",
            margin: "1px 1px 4px 1px",
            padding: "2px",

        },
    });

}
var createCatRow = function (pColor, pName, pCheck, pCircle) {
    var text;
    if (pCheck) {
        text = ui.Checkbox({
            label: pName,
            value: false,
            style: { margin: "0 0 4px 6px", fontSize: "12px", },
        });
    } else {
        text = ui.Label({
            value: pName,
            style: {
                fontSize: "12px",
                padding: "2px",
                margin: "0 0 4px 0",

            },
        });
    }
    var colorEntry;
    if (pCircle) {
        colorEntry = ui.Label({
            style: {
                color: pColor,
                margin: "1px 1px 4px 1px",
            },
            value: "◉",
        });
    }
    else {
        colorEntry = ui.Label({
            style: {
                backgroundColor: pColor,
                padding: "8px",
                margin: "0 0 4px 0",
            },
        });
    }


    return ui.Panel({
        widgets: [colorEntry, text],
        layout: ui.Panel.Layout.Flow("horizontal"),

    });
}

exports.createCatRow = createCatRow


exports.createMultiCriteriaPanel =function(entries) {
    var pnlContainer = ui.Panel();
    entries.forEach(function (e) {
        var pnl = ui.Panel({
            style: {
                margin: '5px 5px',
            },
        });
        pnl.add(ui.Label({
            value: e.title,
            style: {
                fontWeight: 'bold',
                fontSize: '12px',
                margin: '1px 1px 4px 1px',
                padding: '2px',
            },
        }));

        for (var i = 0; i < e.names.length; i++) {
            pnl.add(createCatRow(e.palette[i], e.names[i], true, false));
        }
        pnlContainer.add(pnl);
    });
    return pnlContainer;
};


exports.createLayerEntry=function(layer) {
    
    var chbw = ui.Checkbox(layer.name, layer.visible, null, false, { margin: '4px 6px', fontSize: '12px' });

    var pnlLayerEntry = ui.Panel({
        widgets: [chbw],
        layout: ui.Panel.Layout.Flow("horizontal"),

    });

    // If single color layer show reference color besides text
    if (layer.singleColor !== undefined) {
        var colorEntry = null;
        if (layer.singleColor === 'CIRCLE') {
            colorEntry = ui.Label({
                style: {
                    color: layer.style.color,
                    margin: "1px 1px 4px 1px",
                },
                value: "◉",
            });
        }
        else if (layer.singleColor === 'SQUARE') {
            colorEntry = ui.Label({
                style: {
                    backgroundColor: layer.style.fillColor !== undefined ? layer.style.fillColor : layer.style.color,
                    border: "2px solid " + layer.style.color,
                    padding: "5px",
                    margin: "3px 0 0 0",
                }
            });
        }
        else if (layer.singleColor === 'LINE') {
            colorEntry = ui.Label({
                style: {
                    backgroundColor: layer.style.color,
                    padding: "1px 10px",
                    margin: "10px 0 0 0",
                }
            });
        }

        pnlLayerEntry.widgets().add(colorEntry);
    }

    if (layer.citation !== undefined && layer.citation !== '') {
        // Add i icon ui.Label with link to document 
        pnlLayerEntry.widgets().add(ui.Label('ⓘ', { margin: "0 2px 2px 2px", color: 'blue' }, layer.citation));
    }

    return pnlLayerEntry;

};
