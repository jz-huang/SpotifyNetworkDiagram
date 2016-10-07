//This files contains most of the logic for tableau viz and d3 viz integration
var tableauViz, worksheet, networkDiagram, getDataOptions;

function initTableauViz() {
    var containerDiv = document.getElementById("vizContainer"),
        url = "http://10.32.134.4/views/SXSWJoin_old/Sheet3?:embed=y&:showShareOptions=true&:display_count=no&:showVizHome=no",
        options = {
            hideTabs: true,
            hideToolbar: true,
            allowFullScreen: false,
            onFirstInteractive: function () {
                // enable our button once the viz is ready
                $('#generateNetwork').removeAttr("disabled");

                //This is a way around a bug with highlight marks will need to remove this before publishing as sample
                worksheet = viz.getWorkbook().getActiveSheet();
                worksheet.highlightMarksByPatternMatchAsync("Track Name", "Wild").then(function(){
                    worksheet.clearHighlightedMarksAsync();
                });
            }
        };

    viz = new tableau.Viz(containerDiv, url, options);
    viz.addEventListener(tableau.TableauEventName.MARKS_SELECTION, handleSelectionEvent)
    viz.addEventListener(tableau.TableauEventName.FILTER_CHANGE, handleFilterEvent);
    // Create a viz object and embed it in the container div.
}

function getDataAndConstructGraph() {
    getDataOptions = {
    	maxRows: 0,
    	ignoreAliases: false,
    	ignoreSelection: true,
    	includeAllColumns: true
    };

    worksheet.getUnderlyingDataAsync(getDataOptions).then(function(dataTable){
            setupNetwork(parseTableauData(dataTable));
    });
}

function setupNetwork(data) {
	var defaultLinkField = "Danceability";
	var linkDeltas = {Danceability: 0.05, Energy: 0.05, Speechiness: 0.05};
	var graphContainer = d3.select('#graph');
	var notesContainer = d3.select('#notes')
		.style({
			'width': 140 + 'px',
			'height': 600 + 'px'
		});
	networkDiagram = new NetWorkDiagram(linkDeltas, graphContainer, notesContainer);
	networkDiagram.addOnDeselectEventHandler(clearHighlightedTableauMarks);
	networkDiagram.addOnSelectEventHandler(highlightTableauMarks);
	networkDiagram.renderNetWork(data, defaultLinkField);
	setUpDomInteractions();
}

function setUpDomInteractions() {
	$('#acceptButton').click(function() {
		if (networkDiagram.selectedNode !== null) {
			setExplicitCheckResult(networkDiagram.selectedNode, true);
		}
	});
	$('#rejectButton').click(function() {
		if (networkDiagram.selectedNode !== null) {
			setExplicitCheckResult(networkDiagram.selectedNode, false);
		}
	});
	$('#properties-dropdown').change(function(event) {
        var property = $(this).val();
        netWorkDiagram.updateNetWorkLinkProperty(property);
    });
}

function parseTableauData(dataTable) {
    var columns = dataTable.getColumns();
    var data = dataTable.getData();
    var fieldNamesNeeded = ["Album Name", "Artist Name", "Explicit", "Image URL", "Preview Url", "Track Name", "Danceability",
                      "Energy", "Instrumentalness", "Key", "Liveness", "Loudness", "Popularity", "Tempo", "Valence",
                      "Time Signature"];
    var fieldNamesIndexMap = {};
    columns.forEach(function(column) {
        if (fieldNamesNeeded.includes(column.getFieldName()) !== -1) {
            fieldNamesIndexMap[column.getFieldName()] = column.getIndex();
        }
    });

    var tracksMap = {};
    data.forEach(function(rowEntry) {
        var trackName = rowEntry[fieldNamesIndexMap["Track Name"]].value;
        //tracks with multiple artists lead to multiple entries for a track in data set
        if (tracksMap[trackName] !== undefined) {
            var artistNames = tracksMap[trackName]["Artist Name"];
            var newArtistName = rowEntry[fieldNamesIndexMap["Artist Name"]].value;
            if (!artistNames.includes(newArtistName)) {
                artistNames.push(newArtistName);
            }
            return;
        }
        var track = {};
        for (field in fieldNamesIndexMap) {
            var fieldIndex = fieldNamesIndexMap[field];
            var fieldValue = rowEntry[fieldIndex].value;
            if (field === "Artist Name") {
                track[field] = [fieldValue];
            } else {
                track[field] = fieldValue;
            }
        }
        tracksMap[trackName] = track;
    });

    var tracks = [];
    for (var trackName in tracksMap) {
        tracks.push(tracksMap[trackName]);
    }
    currentData = tracks;
    return tracks;
}


//tableau event handlers
function handleSelectionEvent(selectionEvent) {
    selectionEvent.getMarksAsync().then(function(marks) {
        var pairs = marks[0].getPairs();
        pairs.forEach(function(pair) {
            if (pair.fieldName === "Track Name") {
                clickNode(pair.value);
                netWorkDiagram.clickNode(pair.value);
            }
        });
    });
}

function handleFilterEvent(filterEvent) {
    worksheet.getUnderlyingDataAsync(getDataOptions).then(function(dataTable){
        netWorkDiagram.updateNetWorkData(convertToJSON(dataTable));
    });
}

//callback functions to respond to networkDiagram clicks
function highlightTableauMarks(connectedTrackNames) {
	worksheet.highlightMarksAsync("Track Name", connectedTrackNames);
}

function clearHighlightedTableauMarks() {
	worksheet.clearHighlightedMarksAsync();
}