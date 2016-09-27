var viz, sheet, table, api_options;

function initViz() {
    var containerDiv = document.getElementById("vizContainer"),
        url = "http://10.38.0.37/views/2013TornadoSightingsNOAA/Sheet1",
        options = {
            hideTabs: true,
            hideToolbar: true,
            onFirstInteractive: function () {
                // enable our button once the viz is ready
                $('#generateTable').removeAttr("disabled");
            }
        };
    
    viz = new tableau.Viz(containerDiv, url, options); 
    // Create a viz object and embed it in the container div.
}

// Takes an array
function convertToJSON(input){
    var output = [];

    for(i=0; i<input.length; i++) {
        var item = [input[i][7].value, input[i][5].value, input[i][0].value, input[i][6].value, input[i][8].value, input[i][1].value, input[i][3].value, input[i][9].value, input[i][12].value, input[i][13].value, input[i][10].value, 
            input[i][11].value, input[i][2].value, input[i][4].value, input[i][15].value, input[i][18].value, input[i][14].value, input[i][16].value];
        
        output.push(item);
    }
    
    return output;
}

function getUnderlyingData(){
    sheet = viz.getWorkbook().getActiveSheet();
    options = {};
    options["maxRows"] = 0;
    options["ignoreAliases"] = false;
    options["ignoreSelection"] = true;
    options["getJSON"] = false;
    options["includeAllColumns"] = true;
    sheet.getUnderlyingDataAsync(options).then(function(t){
            table = t; 
            renderTable(convertToJSON(table.getData()));
    });
}

function renderTable(ourData) {
    $('#dataTable').DataTable( {
        data: ourData,
        columns: [
            { title: "State" },
            { title: "Region" },
            { title: "County" },
            { title: "Region Code" },
            { title: "State Code" },
            { title: "County Code" },
            { title: "Date" },
            { title: "Timezone" },
            { title: "Injuries Direct" },
            { title: "Injuries Indirect" },
            { title: "Deaths Direct" },
            { title: "Deaths Indirect" },
            { title: "Damage" },
            { title: "fScale" },
            { title: "Length" },
            { title: "Width" },
            { title: "Latitude" },
            { title: "Longitude" }
        ] 
    });
}