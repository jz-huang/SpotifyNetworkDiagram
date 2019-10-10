//This files contains most of the logic for tableau viz and d3 viz integration
var tableauViz, worksheet, networkDiagram, getDataOptions;
var initialFestival = null;

function initTableauViz() {
    var containerDiv = document.getElementById("vizContainer"),
        url = "https://public.tableau.com/views/SpotifyMusicFestivals/TrackAudioFeatures",
        options = {
            hideTabs: true,
            hideToolbar: true,
            allowFullScreen: false,
            onFirstInteractive: function () {
                worksheet = viz.getWorkbook().getActiveSheet();
                getDataAndConstructGraph();
                viz.addEventListener(tableau.TableauEventName.MARKS_SELECTION, handleSelectionEvent); 
                viz.addEventListener(tableau.TableauEventName.FILTER_CHANGE, handleFilterEvent);
            }
        };

    viz = new tableau.Viz(containerDiv, url, options);
}

//Uses the Get Data API to extract Data from Viz, parse Data and Construct D3 Diagram
function getDataAndConstructGraph() {
    getDataOptions = {
    	maxRows: 0,
    	ignoreAliases: false,
    	ignoreSelection: true,
    	includeAllColumns: true
    };
    worksheet.getUnderlyingDataAsync(getDataOptions).then(function(dataTable){
            setupFestivalFilterValues(dataTable);
            setupSearchBox(dataTable);
            var artists = parseTableauData(dataTable);
            constructGraph(artists);
    }, function(error) {console.log(error);});
}

//Set up the d3 diagram
function constructGraph(data) {
	var defaultLinkField = "Danceability";
	var graphContainer = d3.select('#graph');
	var notesContainer = d3.select('#notes')
		.style({
			'width': 140 + 'px',
			'height': 600 + 'px'
		});
	networkDiagram = new NetworkDiagram(data, graphContainer, notesContainer);
}

//Parse the Data into the format expected
function parseTableauData(dataTable) {
    var columns = dataTable.getColumns();
    var data = dataTable.getData();
    var fieldNamesNeeded = ["Festival", "Artist Name", "PAUAffiliate?", "Track Preview URL", 
                            "Album Name", "Album Image URL"];
    var fieldNamesIndexMap = {};
    columns.forEach(function(column) {
        if (fieldNamesNeeded.includes(column.getFieldName())) {
            fieldNamesIndexMap[column.getFieldName()] = column.getIndex();
        }
    });

    var artistsMap = {};
    data.forEach(function(rowEntry) {
        var artistName = rowEntry[fieldNamesIndexMap["Artist Name"]].value;
        var affliated = rowEntry[fieldNamesIndexMap["PAUAffiliate?"]].value;
        var festival = rowEntry[fieldNamesIndexMap["Festival"]].value;
        var trackPreviewUrl = rowEntry[fieldNamesIndexMap["Track Preview URL"]].value;
        var trackAlbum = rowEntry[fieldNamesIndexMap["Album Name"]].value;
        var imageURL = rowEntry[fieldNamesIndexMap["Album Image URL"]].value;
        var festivalInfo = {};
        festivalInfo.trackPreviewUrl = trackPreviewUrl;
        festivalInfo.trackAlbum = trackAlbum;
        festivalInfo.imageUrl = imageURL;

        var artistNode;
        if (artistName in artistsMap) {
            artistNode = artistsMap[artistName];
            if (!artistNode.festivals.includes(festival)) {
                artistNode.festivals.push(festival);
                artistNode.festivalInfoMap[festival] = festivalInfo;
            }
        } else {
            festivalInfoMap = {};
            festivalInfoMap[festival] = festivalInfo;
            artistNode = {
                name : artistName,
                affliated : (affliated === "Yes"),
                festivals : [festival],
                festivalInfoMap : festivalInfoMap
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
//Update the network with selected artist and current festival.
function handleSelectionEvent(selectionEvent) {
    selectionEvent.getMarksAsync().then(function(marks) {
        var artistName = getArtistName(marks);
        var currFestival = $('#festival-filter').text();

        networkDiagram.updateArtist(artistName, currFestival);
    });
}

function getArtistName(marks) {
    var pairs = marks[0].getPairs();
    var artistName;
    pairs.forEach(function(pair) {
        if (pair.fieldName === "Artist Name") {
            artistName = pair.value;
        }
    });
    return artistName;
}

// Clear the D3 Diagram whenever filter is changed
function handleFilterEvent(filterEvent) {
    $('#graph').empty();
    $('#notes').empty();
    getDataOptions = {
        maxRows: 0,
        ignoreAliases: false,
        ignoreSelection: true,
        includeAllColumns: true
    };
    worksheet.getUnderlyingDataAsync(getDataOptions).then(function(dataTable){
            setupSearchBox(dataTable);
    }, function(error) {console.log(error);});
}

//Toolbar setup
//Dynamically Set the Names of All the Festivals for Filter
function setupFestivalFilterValues(dataTable) {
    var festivalNames = getColumnValues(dataTable, "Festival");
    // display the festival names in the UI menu
    setupFestivalsMenu(_.uniq(festivalNames));
}

function setupFestivalsMenu(festivalNames) {
    var festivalDropdown = $("#festival-dropdown");
    festivalNames.forEach(function(festivalName) {
        var festivalText = document.createTextNode(festivalName);
        var dropdownItem = document.createElement("a");
        dropdownItem.setAttribute("class", "dropdown-item");
        dropdownItem.append(festivalText);
        dropdownItem.addEventListener("click", function() {
            filterByFestival(festivalName);
            $('#festival-filter').text(festivalName);
        });
        festivalDropdown.append(dropdownItem);
    });
}

function filterByFestival(festivalName) {
    worksheet.applyFilterAsync("Festival", festivalName, tableau.FilterUpdateType.REPLACE);
}

function setupSearchBox(dataTable) {
    var artistNames = getColumnValues(dataTable, "Artist Name");

    $('#artist-search-box').autocomplete({
        source : _.uniq(artistNames),
        select : function (event, ui) {
            worksheet.selectMarksAsync("Artist Name", ui.item.label,
                tableau.SelectionUpdateType.REPLACE);
            console.log(ui.item.label);
            return true;
        }
    });
}

// Common util function that extracts the data values in the specified column
function getColumnValues(dataTable, fieldName) {
    var columns = dataTable.getColumns(); // All the column meta data in the DataTable
    var data = dataTable.getData(); // The actual data values

    // Find the specified column
    var column = columns.find(function(column) {
        return column.getFieldName() === fieldName;
    });

    // Get the corresponding data value from each row of data, 
    // based on the column index.
    var results = data.map(function(row) {
        return row[column.getIndex()].value;
    });

    return results;
}
