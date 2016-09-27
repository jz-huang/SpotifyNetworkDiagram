var viz, sheet, table, api_options;
        
function initViz() {
    var containerDiv = document.getElementById("vizContainer");
    var url = "http://10.38.0.37/views/Cereal/ProteinCalories";
    var options = {
        width: containerDiv.offsetWidth,
        height: containerDiv.offsetHeight,
        hideTabs: true,
        hideToolbar: true,
        onFirstInteractive: function () {
            // enable our button once the viz is ready
            $('#pullImages').removeAttr("disabled");
        }
    };
    
    viz = new tableau.Viz(containerDiv, url, options); 
    // Create a viz object and embed it in the container div.
}

// Takes an array
function convertToJSON(input){
    var output = [];

    for(i=0; i<input.length; i++) {
        var item = {};
        item["Cereal Name"] = input[i][0].value;
        item["Manufacturer"] = input[i][2].value;
        item["Calories"] = input[i][3].value;
        item["Protein (g)"] = input[i][10].value;
        item["Fat (g)"] = input[i][7].value;
        item["Sodium (mg)"] = input[i][11].value;
        item["Dietary Fiber (g)"] = input[i][6].value;
        item["Complex Carbs (g)"] = input[i][4].value;
        item["Sugars (g)"] = input[i][12].value;
        item["Potassium (mg)"] = input[i][9].value;
        item["Cups Per Oz"] = input[i][5].value;
        item["Image"] = input[i][1].value;
        
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
            renderD3(convertToJSON(table.getData()));
    });
}

function renderD3(ourData) {
    var margin = {top: 20, right: 20, bottom: 30, left: 40},
        width = 480 - margin.left - margin.right,
        height = 250 - margin.top - margin.bottom;

    /* 
    * value accessor - returns the value to encode for a given data object.
    * scale - maps value to a visual display encoding, such as a pixel position.
    * map function - maps from data value to display value axis - sets up axis
    */ 

    // setup x 
    var xValue = function(d) { return d.Calories;}, // data -> value
        xScale = d3.scale.linear().range([0, width]), // value -> display
        xMap = function(d) { return xScale(xValue(d));}, // data -> display
        xAxis = d3.svg.axis().scale(xScale).orient("bottom");

    // setup y
    var yValue = function(d) { return d["Protein (g)"];}, // data -> value
        yScale = d3.scale.linear().range([height, 0]), // value -> display
        yMap = function(d) { return yScale(yValue(d));}, // data -> display
        yAxis = d3.svg.axis().scale(yScale).orient("left");

    // setup fill color
    var cValue = function(d) { return d.Manufacturer;},
        color = d3.scale.category10();

    // add the graph canvas to the body of the webpage
    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
    .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // add the tooltip area to the webpage
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // change string (from CSV) into number format
    ourData.forEach(function(d) {
        d.Calories = +d.Calories;
        d["Protein (g)"] = +d["Protein (g)"];
    //    console.log(d);
    });

    // don't want dots overlapping axis, so add in buffer to data domain
    xScale.domain([d3.min(ourData, xValue)-1, d3.max(ourData, xValue)+1]);
    yScale.domain([d3.min(ourData, yValue)-1, d3.max(ourData, yValue)+1]);

    // x-axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .append("text")
        .attr("class", "label")
        .attr("x", width)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text("Calories");

    // y-axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Protein (g)");
        
        var node = svg.selectAll(".node")
        .data(ourData)
        .enter().append("g")
        .attr("cx", xMap)
        .attr("cy", yMap)
        .attr("class", "node");

    node.append("image")
        .attr("xlink:href", function(d) {
            return "./img/" + d.Image;
        })
        .on("click", function(d) {
            window.location.href = "./img/" + d.Image;
        })
        .attr("x", xMap)
        .attr("y", yMap)
        .attr("width", 64)
        .attr("height", 64)
            .on("mouseover", function(d) {
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(d["Cereal Name"] + "<br/> (" + xValue(d) + ", " + yValue(d) + ")")
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
        

    // draw legend
    var legend = svg.selectAll(".legend")
        .data(color.domain())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    // draw legend colored rectangles
    legend.append("rect")
        .attr("x", width - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", color);

    // draw legend text
    legend.append("text")
        .attr("x", width - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d;})

}