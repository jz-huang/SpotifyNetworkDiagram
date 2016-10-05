var NetWorkDiagram = function(data, linkField, deltas, containerDOM, notesDOM, visualProperties) {
	this.data = data;
	this.linkField = linkField;
	this.deltas = deltas;
	this.container = containerDOM;
	this.width = visualProperties.width || 800;
	this.height = visualProperties.height || 600;
	this.graph = containerDom;
	this.notes = notesDom;
	//Visual Properties of the graph
	this.labelFill = visualProperties.labelFill || '#444';
	this.adjLabelFill = visualProperties.adjLabelFill || '#aaa';
	this.edgeStroke = visualProperties.edgeStroke || '#aaa';
	this.nodeRadius = visualProperties.nodeRatius || 10;
	this.selectedNodeRatius = visualProperties.selectedNodeRatius || 30;
}

NetWorkDiagram.prototype.renderNetWork = function() {

	var linkDistance = Math.min(this.width, this.height)/4;

	// Create the SVG container for the visualization and
    // define its dimensions.
    var svg = graph.append('svg')
        .attr('width', this.width)
        .attr('height', this.height);


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

};