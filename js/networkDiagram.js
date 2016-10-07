//This file contains most of the logic for the d3 viz, which is represented through an instance
//of the NetWorkDiagram class.
var NetWorkDiagram = function(deltas, containerDiv, notesDiv) {
    this.deltas = deltas;
    //The main graph container
	this.graph = containerDiv;
	this.notes = notesDiv;
	//Visual Properties of the graph
}

NetWorkDiagram.prototype.renderNetWork = function(data, linkField) {
    this.data = data;
    this.linkField = linkField;
    var linkDelta = this.deltas[linkField];
    var that = this;
    // Define the dimensions of the visualization. We're using
    // a size that's convenient for displaying the graphic on
    // http://bl.ocks.org

    var width = 800,
        height = 600;

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

	// Create the SVG container for the visualization and
    // define its dimensions.
    var svg = this.graph.append('svg')
        .attr('width', width)
        .attr('height', height);


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

    // Find the graph nodes from the data set. Each
        // album is a separate node.

    var nodes = this.data.map(function(entry, idx, list) {

        // This iteration returns a new object for
        // each node.

        var node = {};

        // We retain some of the album's properties.
        for (var fieldName in entry) {
            node[fieldName] = entry[fieldName];
        }
        node.color = getColor(node[linkField]);

        // We'll also copy the musicians, again using
        // a more neutral property. At the risk of
        // some confusion, we're going to use the term
        // "link" to refer to an individual connection
        // between nodes, and we'll use the more
        // mathematically correct term "edge" to refer
        // to a line drawn between nodes on the graph.
        // (This may be confusing because D3 refers to
        // the latter as "links."

        node.links = entry[linkField];

        // As long as we're iterating through the nodes
        // array, take the opportunity to create an
        // initial position for the nodes. Somewhat
        // arbitrarily, we start the nodes off in a
        // circle in the center of the container.

        var radius = 0.4 * Math.min(height, width);
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

    // Start by iterating through the tracks

    this.data.forEach(function(srcNode, srcIdx, srcList) {

        // For each track, form links based on link field and link delta

        for (var tgtIdx = srcIdx +1; tgtIdx < srcList.length; tgtIdx++) {
            var tgtNode = srcList[tgtIdx];
            var targetValue = parseFloat(tgtNode[linkField]);
            var srcValue = parseFloat(srcNode[linkField]);
            if (Math.abs(targetValue-srcValue) < linkDelta) {
                links.push({
                    source: srcIdx,
                    target: tgtIdx,
                    link: linkField + ": " + srcNode[linkField] + "," + tgtNode[linkField]
                })
            }
        }
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

    this.edgeSelection = svg.selectAll('.edge')
        .data(edges)
        .enter()
        .append('line')
        .classed('edge', true)
        .style('stroke', edgeStroke)
        .call(positionEdge, nodes);

    // Next up are the nodes.

    this.nodeSelection = svg.selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .classed('node', true)
        .call(positionNode);

    this.nodeSelection.append('circle')
        .attr('r', nodeRadius)
        .attr('data-node-index', function(d,i) { return i;})
        .style('fill', function(d, i) {
            return getColor(d[linkField])
        });

    // Now that we have our main selections (edges and
    // nodes), we can create some subsets of those
    // selections that will be helpful. Those subsets
    // will be tied to individual nodes, so we'll
    // start by iterating through them. We do that
    // in two separate passes.

    this.nodeSelection.each(function(node){

        // First let's identify all edges that are
        // incident to the node. We collect those as
        // a D3 selection so we can manipulate the
        // set easily with D3 utilities.

        node.incidentEdgeSelection = that.edgeSelection
            .filter(function(edge) {
                return nodes[edge.source] === node ||
                    nodes[edge.target] === node;
            });
    });

    // Now make a second pass through the nodes.

    this.nodeSelection.each(function(node){

        // For this pass we want to find all adjacencies.
        // An adjacent node shares an edge with the
        // current node.

        node.adjacentNodeSelection = that.nodeSelection
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

    this.labelLinkSelection = svg.selectAll('line.labelLink')
        .data(labelLinks);

    // The label pseud-nodes themselves are just
    // `<g>` containers.

    this.labelSelection = svg.selectAll('g.labelNode')
        .data(labels)
        .enter()
        .append('g')
            .classed('labelNode',true);

    // Now add the text itself. Of the paired
    // pseudo-nodes, only odd ones get the text
    // elements.

    this.labelSelection.append('text')
        .text(function(d, i) {
            return i % 2 == 0 ? '' : d.node["Track Name"];
        })
        .attr('data-node-index', function(d, i){
            return i % 2 == 0 ? 'none' : Math.floor(i/2);
        });

    // The last bit of markup are the lists of
    // connections for each link.

    this.connectionSelection = this.graph.selectAll('ul.connection')
        .data(edges)
        .enter()
        .append('ul')
        .classed('connection hidden', true)
        .attr('data-edge-index', function(d,i) {return i;});

    this.connectionSelection.each(function(connection){
        var selection = d3.select(this);
        connection.links.forEach(function(link){
            selection.append('li')
                .text(link);
        })
    });

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

    this.nodeSelection.call(force.drag);

    // Handle clicks on the nodes.

    this.nodeSelection.on('click', this.nodeClicked);

    this.labelSelection.on('click', function(pseudonode) {
        nodeClicked(pseudonode.node);
    });

    // Handle clicks on the edges.

    this.edgeSelection.on('click', this.edgeClicked);
    this.connectionSelection.on('click', this.edgeClicked);

    // Animate the force layout.

    force.on('tick', function() {

        // Constrain all the nodes to remain in the
        // graph container.

        that.nodeSelection.each(function(node) {
            node.x = Math.max(node.x, 2*selectedNodeRadius);
            node.y = Math.max(node.y, 2*selectedNodeRadius);
            node.x = Math.min(node.x, width-2*selectedNodeRadius);
            node.y = Math.min(node.y, height-2*selectedNodeRadius);
        });

        // Kick the label layout to make sure it doesn't
        // finish while the main layout is still running.

        labelForce.start();

        // Calculate the positions of the label nodes.

        that.labelSelection.each(function(label, idx) {

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

        that.connectionSelection.each(function(connection){
            var x = (connection.source.x + connection.target.x)/2 - 27;
            var y = (connection.source.y + connection.target.y)/2;
            d3.select(this)
                .style({
                    'top':  y + 'px',
                    'left': x + 'px'
                });
        });

        // Update the posistions of the nodes and edges.

        that.nodeSelection.call(positionNode);
        that.labelSelection.call(positionNode);
        that.edgeSelection.call(positionEdge);
        that.labelLinkSelection.call(positionEdge);

    });

    // Start the layout computations.
    force.start();
    labelForce.start();

};

NetWorkDiagram.prototype.updateNetWorkData = function(data) {
    this.graph.selectAll("*").remove();
    this.notes.selectAll("*").remove();
    this.renderNetwork(data, this.linkField);
}

NetWorkDiagram.prototype.updateNetWorkLinkProperty = function(linkField) {
    this.graph.selectAll("*").remove();
    this.notes.selectAll("*").remove();
    this.renderNetWork(this.data, linkField);
}

NetWorkDiagram.prototype.nodeClicked = function(node, callback) {
    // Ignore events based on dragging.
    if (d3.event !== null && d3.event.defaultPrevented) return;

    // Remember whether or not the clicked
    // node is currently selected.

    var selected = node.selected;

    //prevent selections on tableau viz from deselecting the d3 viz
    if (selected && d3.event === null) {
        return;
    }

    // Keep track of the desired text color.

    var fillColor;

    // In all cases we start by resetting
    // all the nodes and edges to their
    // de-selected state. We may override
    // this transition for some nodes and
    // edges later.

    this.nodeSelection
        .each(function(node) { node.selected = false; })
        .selectAll('circle')
            .transition()
            .attr('r', nodeRadius)
            .style('fill', function(node, index) {
                return getColor(node[linkField]);
            });

    this.edgeSelection
        .transition()
        .style('stroke', edgeStroke);

    this.labelSelection
        .transition()
        .style('opacity', 0);

    // Now see if the node wasn't previously selected.
    var worksheet = viz.getWorkbook().getActiveSheet();
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

        this.labelSelection
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

        this.labelSelection
            .filter(function(label) {return label.node === node;})
            .transition()
            .style('opacity', 1);

        // And note the desired color for bundling with
        // the transition of the label position.

        fillColor = node.text;

        this.selectedNode = node;
        node.previouslyCheckedExplicit = false;
        node.previousExplicitCheckResult = false;

        // Delete the current notes section to prepare
        // for new information.

        this.notes.selectAll('*').remove();

        // Fill in the notes section with informationm
        // from the node. Because we want to transition
        // this to match the transitions on the graph,
        // we first set it's opacity to 0.

        this.notes.style({'opacity': 0});

        // Now add the notes content.
        this.notes.append('audio')
                .attr('id', 'audioPreview')
                .attr('src', node["Preview Url"]);

        this.notes.append('h1').text(node["Track Name"]);
        this.notes.append('h2').text("Album: " + node["Album Name"]);
        var imageUrl = node["Image URL"];
        if (imageUrl) {
            notes.append('div')
                .on('mouseover', function() {
                    PlaySoundWithExplicitCheck(node);
                })
                .on('mouseout', StopSound)
                .classed('artwork',true)
                .append('a')
                .append('img')
                    .attr('src', imageUrl)
                    .attr('style', "width:200px;height:200px;")

        }
        this.notes.append('br');

        var list = notes.append('ul').text("Artists: ");
        node["Artist Name"].forEach(function(link){
            list.append('li')
                .text(link);
        });

        // With the content in place, transition
        // the opacity to make it visible.

        this.notes.transition().style({'opacity': 1});
        if (d3.event !== null & this.selectEventHandler != null) { //only triger this for mouse events
            var adjacentTracks = [];
            node.adjacentNodeSelection.each(function(node) {
                adjacentTracks.push(node["Track Name"]);
            })
            adjacentTracks.push(node["Track Name"]);
            this.clickEventHandler("Track Name", adjacentTracks);
        }
    } else {

        // Since we're de-selecting the current
        // node, transition the notes section
        // and then remove it.

        this.notes.transition()
            .style({'opacity': 0})
            .each('end', function(){
                notes.selectAll('*').remove();
            });

        // Transition all the labels to their
        // default styles.

        this.labelSelection
            .transition()
            .style('opacity', 1)
            .selectAll('text')
                .style('fill', labelFill);

        // The fill color for the current node's
        // label must also be bundled with its
        // position transition.

        fillColor = labelFill;

        this.selectedNode = null;

        if (this.deselectEventHandler != null) {
            this.deselectEventHandler();
        }
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
}

NetWorkDiagram.prototype.edgeClicked = function(edge, idx) {
    // Remember the current selection state of the edge.

    var selected = edge.selected;

    // Transition all connections to hidden. If the
    // current edge needs to be displayed, it's transition
    // will be overridden shortly.

    this.connectionSelection
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

NetWorkDiagram.prototype.clickNode = function(trackName) {
    var selectedNode = this.nodeSelection.each(function(node) {
        if (node["Track Name"] === trackName) {
            nodeSelection.on('click')(node);
            return;
        }
    });
}

NetWorkDiagram.prototype.addOnSelectEventHandler = function(eventHandler) {
    this.selectEventHandler = eventHandler;
}

NetWorkDiagram.prototype.addOnDeselectEventHandler = function(eventHandler) {
    this.deselectEventHandler = eventHandler;
}

//Utility Methods for Sound Playing

function PlaySoundWithExplicitCheck(node) {
    explicit = node['Explicit'];
    if (explicit === 'false') {
        PlaySound();
    } else if (node.previouslyCheckedExplicit === false) {
        $('#myModal').modal('show');
    } else if (node.previousExplicitCheckResult === true) {
        PlaySound();
    }
}

function setExplicitCheckResult(node, result) {
    node.previousExplicitCheck = true;
    node.previousExplicitCheckResult = result;
}

function PlaySound() {
    var selectedTrack=document.getElementById("audioPreview");
    selectedTrack.play();

}

function StopSound() {
    var selectedTrack=document.getElementById("audioPreview");
    selectedTrack.pause();
    selectedTrack.currentTime = 0; //reset track back to beginning
}

function getColor(value){
    //value from 0 to 1
    var hue=((1-value)*120).toString(10);
    return ["hsl(",hue,",100%,50%)"].join("");
}