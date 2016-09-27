var viz, sheet, table, api_options;

function initViz() {
    var containerDiv = document.getElementById("vizContainer"),
        url = "http://localhost/views/spotify_getData/Sheet1?:embed=y&:showShareOptions=true&:display_count=no&:showVizHome=no",
        options = {
            hideTabs: true,
            hideToolbar: true,
            onFirstInteractive: function () {
                // enable our button once the viz is ready
                $('#generateNetwork').removeAttr("disabled");
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
        item.artist = input[i][0].value;
        item.title = input[i][6].value;
        item.itunes = input[i][3].value;
        item.cover = input[i][2].value;
        item.color = input[i][1].value;
        item.text = input[i][5].value;

        // We need to break musicians apart
        item.musicians = input[i][4].value.split("|");

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
            renderNetwork(convertToJSON(table.getData()));
    });
}

function renderNetwork(jsonData) {
    // Define the dimensions of the visualization. We're using
    // a size that's convenient for displaying the graphic on
    // http://bl.ocks.org

    var width = 800,
        height = 500;

    // Visual properties of the graph are next. We need to make
    // those that are going to be animated accessible to the
    // JavaScript.

    var labelFill = '#444';
    var adjLabelFill = '#aaa';
    var edgeStroke = '#aaa';
    var nodeFill = '#ccc';
    var nodeRadius = 10;
    var selectedNodeRadius = 30;

    var linkDistance = Math.min(width,height)/4;

    // Find the main graph container.

    var graph = d3.select('#graph');

    // Create the SVG container for the visualization and
    // define its dimensions.

    var svg = graph.append('svg')
        .attr('width', width)
        .attr('height', height);

    // Select the container for the notes and dimension it.

    var notes = d3.select('#notes')
        .style({
            'width': 940-width + 'px',
            'height': height + 'px'
        });

    // Utility function to update the position properties
    // of an arbtrary edge that's part of a D3 selection.
    // The optional parameter is the array of nodes for
    // the edges. If present, the source and target properties
    // are assumed to be indices in this array rather than
    // direct references.

    var positionEdge = function(edge, nodes) {
        edge.attr('x1', function(d) {
            return nodes ? nodes[d.source].x : d.source.x;
        }).attr('y1', function(d) {
            return nodes ? nodes[d.source].y : d.source.y;
        }).attr('x2', function(d) {
            return nodes ? nodes[d.target].x : d.target.x;
        }).attr('y2', function(d) {
            return nodes ? nodes[d.target].y : d.target.y;
        });
    };

    // Utility function to update the position properties
    // of an arbitrary node that's part of a D3 selection.

    var positionNode = function(node) {
        node.attr('transform', function(d) {
            return 'translate(' + d.x + ',' + d.y + ')';
        });
    };

    // Utility function to position text associated with
    // a label pseudo-node. The optional third parameter
    // requests transition to the specified fill color.

    var positionLabelText = function(text, pseudonode, fillColor) {

        // What's the width of the text element?

        var textWidth = text.getBBox().width;

        // How far is the pseudo-node from the real one?

        var diffX = pseudonode.x - pseudonode.node.x;
        var diffY = pseudonode.y - pseudonode.node.y;
        var dist = Math.sqrt(diffX * diffX + diffY * diffY);

        // Shift in the x-direction a fraction of the text width

        var shiftX = textWidth * (diffX - dist) / (dist * 2);
        shiftX = Math.max(-textWidth, Math.min(0, shiftX));

        var shiftY = pseudonode.node.selected ? selectedNodeRadius : nodeRadius;
        shiftY = 0.5 * shiftY * diffY/Math.abs(diffY);

        var select = d3.select(text);
        if (fillColor) {
            select = select.transition().style('fill', fillColor);
        }
        select.attr('transform', 'translate(' + shiftX + ',' + shiftY + ')');
    };


    // Retrieve the data. It's saved in an external file
    // instead of inlined to keep the code reasonably
    // easy to read.
    //d3.json(jsonData, function(error, data) {
        data = jsonData

        // Find the graph nodes from the data set. Each
        // album is a separate node.

        var nodes = data.map(function(entry, idx, list) {

            // This iteration returns a new object for
            // each node.

            var node = {};

            // We retain some of the album's properties.

            node.title    = entry.title;
            node.subtitle = entry.artist;
            node.image    = entry.cover;
            node.url      = entry.itunes;
            node.color    = entry.color;
            node.text     = entry.text;

            // We'll also copy the musicians, again using
            // a more neutral property. At the risk of
            // some confusion, we're going to use the term
            // "link" to refer to an individual connection
            // between nodes, and we'll use the more
            // mathematically correct term "edge" to refer
            // to a line drawn between nodes on the graph.
            // (This may be confusing because D3 refers to
            // the latter as "links."

            node.links = entry.musicians.slice(0);

            // As long as we're iterating through the nodes
            // array, take the opportunity to create an
            // initial position for the nodes. Somewhat
            // arbitrarily, we start the nodes off in a
            // circle in the center of the container.

            var radius = 0.4 * Math.min(height,width);
            var theta = idx*2*Math.PI / list.length;
            node.x = (width/2) + radius*Math.sin(theta);
            node.y = (height/2) + radius*Math.cos(theta);

            // Return the newly created object so it can be
            // added to the nodes array.

            return node;
        });

        // Identify all the indivual links between nodes on
        // the graph. As noted above, we're using the term
        // "link" to refer to a single connection. As we'll
        // see below, we'll call lines drawn on the graph
        // (which may represent a combination of multiple
        // links) "edges" in a nod to the more mathematically
        // minded.

        var links = [];

        // Start by iterating through the albums.

        data.forEach(function(srcNode, srcIdx, srcList) {

            // For each album, iterate through the musicians.

            srcNode.musicians.forEach(function(srcLink) {

                // For each musican in the "src" album, iterate
                // through the remaining albums in the list.

                for (var tgtIdx = srcIdx + 1;
                        tgtIdx < srcList.length;
                        tgtIdx++) {

                    // Use a variable to refer to the "tgt"
                    // album for convenience.

                    var tgtNode = srcList[tgtIdx];

                    // Is there any musician in the "tgt"
                    // album that matches the musican we're
                    // currently considering from the "src"
                    // album?

                    if (tgtNode.musicians.some(function(tgtLink){
                        return tgtLink === srcLink;
                    })) {

                        // When we do find a match, add a new
                        // link to the links array.

                        links.push({
                            source: srcIdx,
                            target: tgtIdx,
                            link: srcLink
                        });
                    }
                }
            });
        });

        // Now create the edges for our graph. We do that by
        // eliminating duplicates from the links array.

        var edges = [];

        // Iterate through the links array.

        links.forEach(function(link) {

            // Assume for now that the current link is
            // unique.

            var existingEdge = false;

            // Look through the edges we've collected so
            // far to see if the current link is already
            // present.

            for (var idx = 0; idx < edges.length; idx++) {

                // A duplicate link has the same source
                // and target values.

                if ((link.source === edges[idx].source) &&
                    (link.target === edges[idx].target)) {

                    // When we find an existing link, remember
                    // it.
                    existingEdge = edges[idx];

                    // And stop looking.

                    break;
                }
            }

            // If we found an existing edge, all we need
            // to do is add the current link to it.

            if (existingEdge) {

                existingEdge.links.push(link.link);

            } else {

                // If there was no existing edge, we can
                // create one now.

                edges.push({
                    source: link.source,
                    target: link.target,
                    links: [link.link]
                });
            }
        });

        // Start the creation of the graph by adding the edges.
        // We add these first so they'll appear "underneath"
        // the nodes.

        var edgeSelection = svg.selectAll('.edge')
            .data(edges)
            .enter()
            .append('line')
            .classed('edge', true)
            .style('stroke', edgeStroke)
            .call(positionEdge, nodes);

        // Next up are the nodes.

        var nodeSelection = svg.selectAll('.node')
            .data(nodes)
            .enter()
            .append('g')
            .classed('node', true)
            .call(positionNode);

        nodeSelection.append('circle')
            .attr('r', nodeRadius)
            .attr('data-node-index', function(d,i) { return i;})
            .style('fill', nodeFill)

        // Now that we have our main selections (edges and
        // nodes), we can create some subsets of those
        // selections that will be helpful. Those subsets
        // will be tied to individual nodes, so we'll
        // start by iterating through them. We do that
        // in two separate passes.

        nodeSelection.each(function(node){

            // First let's identify all edges that are
            // incident to the node. We collect those as
            // a D3 selection so we can manipulate the
            // set easily with D3 utilities.

            node.incidentEdgeSelection = edgeSelection
                .filter(function(edge) {
                    return nodes[edge.source] === node ||
                        nodes[edge.target] === node;
                });
        });

        // Now make a second pass through the nodes.

        nodeSelection.each(function(node){

            // For this pass we want to find all adjacencies.
            // An adjacent node shares an edge with the
            // current node.

            node.adjacentNodeSelection = nodeSelection
                .filter(function(otherNode){

                    // Presume that the nodes are not adjacent.
                    var isAdjacent = false;

                    // We can't be adjacent to ourselves.

                    if (otherNode !== node) {

                        // Look the incident edges of both nodes to
                        // see if there are any in common.

                        node.incidentEdgeSelection.each(function(edge){
                            otherNode.incidentEdgeSelection.each(function(otherEdge){
                                if (edge === otherEdge) {
                                    isAdjacent = true;
                                }
                            });
                        });

                    }

                    return isAdjacent;
                });

        });

        // Next we create a array for the node labels.
        // We're going to use a "hidden" force layout to
        // position the labels so they don't overlap
        // each other. ("Hidden" because the links won't
        // be visible.)

        var labels = [];
        var labelLinks = [];

        nodes.forEach(function(node, idx){

            // For each node on the graph we create
            // two pseudo-nodes for its label. Once
            // pseudo-node will be anchored to the
            // center of the real node, while the
            // second will be linked to that node.

            // Add the pseudo-nodes to their array.

            labels.push({node: node});
            labels.push({node: node});

            // And create a link between them.

            labelLinks.push({
                source: idx * 2,
                target: idx * 2 + 1
            });
        });

        // Construct the selections for the label layout.

        // There's no need to add any markup for the
        // pseudo-links between the label nodes, but
        // we do need a selection so we can run the
        // force layout.

        var labelLinkSelection = svg.selectAll('line.labelLink')
            .data(labelLinks);

        // The label pseud-nodes themselves are just
        // `<g>` containers.

        var labelSelection = svg.selectAll('g.labelNode')
            .data(labels)
            .enter()
            .append('g')
                .classed('labelNode',true);

        // Now add the text itself. Of the paired
        // pseudo-nodes, only odd ones get the text
        // elements.

        labelSelection.append('text')
            .text(function(d, i) {
                return i % 2 == 0 ? '' : d.node.title;
            })
            .attr('data-node-index', function(d, i){
                return i % 2 == 0 ? 'none' : Math.floor(i/2);
            });

        // The last bit of markup are the lists of
        // connections for each link.

        var connectionSelection = graph.selectAll('ul.connection')
            .data(edges)
            .enter()
            .append('ul')
            .classed('connection hidden', true)
            .attr('data-edge-index', function(d,i) {return i;});

        connectionSelection.each(function(connection){
            var selection = d3.select(this);
            connection.links.forEach(function(link){
                selection.append('li')
                    .text(link);
            })
        })

        // Create the main force layout.

        var force = d3.layout.force()
            .size([width, height])
            .nodes(nodes)
            .links(edges)
            .linkDistance(linkDistance)
            .charge(-500);

        // Create the force layout for the labels.

        var labelForce = d3.layout.force()
            .size([width, height])
            .nodes(labels)
            .links(labelLinks)
            .gravity(0)
            .linkDistance(0)
            .linkStrength(0.8)
            .charge(-100);

        // Let users drag the nodes.

        nodeSelection.call(force.drag);

        // Function to handle clicks on node elements

        var nodeClicked = function(node) {

            // Ignore events based on dragging.

            if (d3.event.defaultPrevented) return;

            // Remember whether or not the clicked
            // node is currently selected.

            var selected = node.selected;

            // Keep track of the desired text color.

            var fillColor;

            // In all cases we start by resetting
            // all the nodes and edges to their
            // de-selected state. We may override
            // this transition for some nodes and
            // edges later.

            nodeSelection
                .each(function(node) { node.selected = false; })
                .selectAll('circle')
                    .transition()
                    .attr('r', nodeRadius)
                    .style('fill', nodeFill);

            edgeSelection
                .transition()
                .style('stroke', edgeStroke);

            labelSelection
                .transition()
                .style('opacity', 0);

            // Now see if the node wasn't previously selected.

            if (!selected) {

                // This node wasn't selected before, so
                // we want to select it now. That means
                // changing the styles of some of the
                // elements in the graph.

                // First we transition the incident edges.

                node.incidentEdgeSelection
                    .transition()
                    .style('stroke', node.color);

                // Now we transition the adjacent nodes.

                node.adjacentNodeSelection.selectAll('circle')
                    .transition()
                    .attr('r', nodeRadius)
                    .style('fill', node.color);

                labelSelection
                    .filter(function(label) {
                        var adjacent = false;
                        node.adjacentNodeSelection.each(function(d){
                            if (label.node === d) {
                                adjacent = true;
                            }
                        })
                        return adjacent;
                    })
                    .transition()
                    .style('opacity', 1)
                    .selectAll('text')
                        .style('fill', adjLabelFill);

                // And finally, transition the node itself.

                d3.selectAll('circle[data-node-index="'+node.index+'"]')
                    .transition()
                    .attr('r', selectedNodeRadius)
                    .style('fill', node.color);

                // Make sure the node's label is visible

                labelSelection
                    .filter(function(label) {return label.node === node;})
                    .transition()
                    .style('opacity', 1);

                // And note the desired color for bundling with
                // the transition of the label position.

                fillColor = node.text;

                // Delete the current notes section to prepare
                // for new information.

                notes.selectAll('*').remove();

                // Fill in the notes section with informationm
                // from the node. Because we want to transition
                // this to match the transitions on the graph,
                // we first set it's opacity to 0.

                notes.style({'opacity': 0});

                // Now add the notes content.

                notes.append('h1').text(node.title);
                notes.append('h2').text(node.subtitle);
                if (node.url && node.image) {
                    notes.append('div')
                        .classed('artwork',true)
                        .append('a')
                        .attr('href', node.url)
                        .append('img')
                            .attr('src', node.image);
                }
                var list = notes.append('ul');
                node.links.forEach(function(link){
                    list.append('li')
                        .text(link);
                })

                // With the content in place, transition
                // the opacity to make it visible.

                notes.transition().style({'opacity': 1});

            } else {

                // Since we're de-selecting the current
                // node, transition the notes section
                // and then remove it.

                notes.transition()
                    .style({'opacity': 0})
                    .each('end', function(){
                        notes.selectAll('*').remove();
                    });

                // Transition all the labels to their
                // default styles.

                labelSelection
                    .transition()
                    .style('opacity', 1)
                    .selectAll('text')
                        .style('fill', labelFill);

                // The fill color for the current node's
                // label must also be bundled with its
                // position transition.

                fillColor = labelFill;
            }

            // Toggle the selection state for the node.

            node.selected = !selected;

            // Update the position of the label text.

            var text = d3.select('text[data-node-index="'+node.index+'"]').node();
            var label = null;
            labelSelection.each(function(d){
                if (d.node === node) { label = d; }
            })

            if (text && label) {
                positionLabelText(text, label, fillColor);
            }

        };

        // Function to handle click on edges.

        var edgeClicked = function(edge, idx) {

            // Remember the current selection state of the edge.

            var selected = edge.selected;

            // Transition all connections to hidden. If the
            // current edge needs to be displayed, it's transition
            // will be overridden shortly.

            connectionSelection
                .each(function(edge) { edge.selected = false; })
                .transition()
                .style('opacity', 0)
                .each('end', function(){
                    d3.select(this).classed('hidden', true);
                });

            // If the current edge wasn't selected before, we
            // want to transition it to the selected state now.

            if (!selected) {
                d3.select('ul.connection[data-edge-index="'+idx+'"]')
                    .classed('hidden', false)
                    .style('opacity', 0)
                    .transition()
                    .style('opacity', 1);
            }

            // Toggle the resulting selection state for the edge.

            edge.selected = !selected;

        };

        // Handle clicks on the nodes.

        nodeSelection.on('click', nodeClicked);

        labelSelection.on('click', function(pseudonode) {
            nodeClicked(pseudonode.node);
        });

        // Handle clicks on the edges.

        edgeSelection.on('click', edgeClicked);
        connectionSelection.on('click', edgeClicked);

        // Animate the force layout.

        force.on('tick', function() {

            // Constrain all the nodes to remain in the
            // graph container.

            nodeSelection.each(function(node) {
                node.x = Math.max(node.x, 2*selectedNodeRadius);
                node.y = Math.max(node.y, 2*selectedNodeRadius);
                node.x = Math.min(node.x, width-2*selectedNodeRadius);
                node.y = Math.min(node.y, height-2*selectedNodeRadius);
            });

            // Kick the label layout to make sure it doesn't
            // finish while the main layout is still running.

            labelForce.start();

            // Calculate the positions of the label nodes.

            labelSelection.each(function(label, idx) {

                // Label pseudo-nodes come in pairs. We
                // treat odd and even nodes differently.

                if(idx % 2) {

                    // Odd pseudo-nodes have the actual text.
                    // That text needs a real position. The
                    // pseudo-node itself we leave to the
                    // force layout to position.

                    positionLabelText(this.childNodes[0], label);

                } else {

                    // Even pseudo-nodes (which have no text)
                    // are fixed to the center of the
                    // corresponding real node. This will
                    // override the position calculated by
                    // the force layout.

                    label.x = label.node.x;
                    label.y = label.node.y;

                }
            });

            // Calculate the position for the connection lists.

            connectionSelection.each(function(connection){
                var x = (connection.source.x + connection.target.x)/2 - 27;
                var y = (connection.source.y + connection.target.y)/2;
                d3.select(this)
                    .style({
                        'top':  y + 'px',
                        'left': x + 'px'
                    });
            });

            // Update the posistions of the nodes and edges.

            nodeSelection.call(positionNode);
            labelSelection.call(positionNode);
            edgeSelection.call(positionEdge);
            labelLinkSelection.call(positionEdge);

        });

        // Start the layout computations.
        force.start();
        labelForce.start();
}