//This files contains most of the logic for tableau viz and d3 viz integration
var tableauViz, worksheet, networkDiagram, getDataOptions;

function initTableauViz() {
    var containerDiv = document.getElementById("vizContainer"),
        url = "http://10.32.134.4/views/SpotifyMusicFestivals_small/TrackAudioFeatures?:embed=y&:showShareOptions=true&:display_count=no&:showVizHome=no",
        options = {
            hideTabs: true,
            hideToolbar: true,
            allowFullScreen: false,
            onFirstInteractive: function () {
                // enable our button once the viz is ready
                $('#generateNetwork').removeAttr("disabled");

                //This is a way around a bug with highlight marks will need to remove this before publishing as sample
                // worksheet = viz.getWorkbook().getActiveSheet();
                // worksheet.highlightMarksByPatternMatchAsync("Track Name", "Wild").then(function(){
                //     worksheet.clearHighlightedMarksAsync();
                // });
                worksheet = viz.getWorkbook().getActiveSheet();
                getDataAndConstructGraph();
                viz.addEventListener(tableau.TableauEventName.MARKS_SELECTION, handleSelectionEvent);
            }
        };

    viz = new tableau.Viz(containerDiv, url, options);
    //viz.addEventListener(tableau.TableauEventName.FILTER_CHANGE, handleFilterEvent);
}

function getDataAndConstructGraph() {
    getDataOptions = {
    	maxRows: 0,
    	ignoreAliases: false,
    	ignoreSelection: true,
    	includeAllColumns: true
    };

    worksheet.getUnderlyingDataAsync(getDataOptions).then(function(dataTable){
            constructGraph(parseTableauData(dataTable));
    }, function(error) {console.log(error);});
}

function constructGraph(data) {
	var defaultLinkField = "Danceability";
	var linkDeltas = {Danceability: 0.05, Energy: 0.05, Speechiness: 0.05};
	var graphContainer = d3.select('#graph');
	var notesContainer = d3.select('#notes')
		.style({
			'width': 140 + 'px',
			'height': 600 + 'px'
		});
	networkDiagram = new NetworkDiagram(data, linkDeltas, graphContainer, notesContainer);
	//networkDiagram.addOnDeselectEventHandler(clearHighlightedTableauMarks);
	//networkDiagram.addOnSelectEventHandler(highlightTableauMarks);
	//networkDiagram.renderNetWork("Flume");
	//setUpDomInteractions();
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
        networkDiagram.updateNetWorkLinkProperty(property);
    });
}

function parseTableauData(dataTable) {
    var columns = dataTable.getColumns();
    var data = dataTable.getData();
    var fieldNamesNeeded = ["Festival", "Artist Name", "PAUAffiliate?", "PAUAffiliate? (PAUAffiliates medium.csv)"];
    var fieldNamesIndexMap = {};
    columns.forEach(function(column) {
        if (fieldNamesNeeded.includes(column.getFieldName())) {
            fieldNamesIndexMap[column.getFieldName()] = column.getIndex();
        }
    });

    var artistsMap = {};
    data.forEach(function(rowEntry) {
        var artistName = rowEntry[fieldNamesIndexMap["Artist Name"]].value;
        var affliated;
        if (fieldNamesIndexMap["PAUAffiliate?"] !== undefined) {
            affliated = rowEntry[fieldNamesIndexMap["PAUAffiliate?"]].value;
        } else {
            affliated = rowEntry[fieldNamesIndexMap["PAUAffiliate? (PAUAffiliates medium.csv)"]].value;
        }
        var festival = rowEntry[fieldNamesIndexMap["Festival"]].value;
        var prev = null;

        var artistNode;
        if (artistName in artistsMap) {
            artistNode = artistsMap[artistName];
            if (!artistNode.festivals.includes(festival)) {
                artistNode.festivals.push(festival);
            }
        } else {
            artistNode = {
                name : artistName,
                affliated : (affliated === "Yes"),
                festivals : [festival]
            }
            artistsMap[artistName] = artistNode;
        }
    });

    var artists = [];
    for (var artistName in artistsMap) {
        artists.push(artistsMap[artistName]);
    }
    return artists;
}

//tableau event handlers
function handleSelectionEvent(selectionEvent) {
    selectionEvent.getMarksAsync().then(function(marks) {
        var pairs = marks[0].getPairs();
        pairs.forEach(function(pair) {
            if (pair.fieldName === "Artist Name") {
                networkDiagram.renderNetWork(pair.value);
            }
        });
    });
}

function handleFilterEvent(filterEvent) {
    worksheet.getUnderlyingDataAsync(getDataOptions).then(function(dataTable){
        networkDiagram.updateNetWorkData(convertToJSON(dataTable));
    });
}

//callback functions to respond to networkDiagram clicks
function highlightTableauMarks(connectedTrackNames) {
	worksheet.highlightMarksAsync("Track Name", connectedTrackNames);
}

function clearHighlightedTableauMarks() {
	worksheet.clearHighlightedMarksAsync();
}