
d3.custom.forceGraph = function () {
    var margin = {top: 20, right: 50, bottom: 100, left: 50},
        width = 960,
        height = 960,
        duration = 500;
    
    function createGraph(_selection) {
        _selection.each(function(_data) {

        	var data = _data["data"];
           	var svg = d3.select("#forceGraph"); // prevent reinitialisation of chart
        	var smsMultiplicator = 60; // 1 SMS is equal to 60 seconds Telephone conversation
        	
//        	console.log("forceGraph.data=", data);
                        
            var chartW = width - margin.left - margin.right,
            	chartH = height - margin.top - margin.bottom;
            

            if (data !== undefined && data.length > 0)
            {
            	var from = data[0].from;
            	
            	var nestedData = d3.nest() // nest the data according [to], [service] and sum up durations
                .key(function(d) { return d.to; }).sortKeys(d3.ascending)
                .key(function(d) { return d.service; })
                .rollup(function (d) {
                	return d3.sum(d, function(e) {
                		if (e.service == "DATA") {
//                    		return e.datavolume;
                			return 0;
                    	} else if (e.service == "TEL") {
                    		return e.duration;
                    	} else if (e.service == "SMS") {
                    		return e.duration * smsMultiplicator;
                    	} else if (e.service == "WHATSAPP") {
                    		return e.duration;
                    	}
                	});
                })
                .entries(data);
            	
//            	console.log("forcedGraph.nestedData=", nestedData);
            	
            	var dataset = { nodes : [], links : []};
            	var length = 0, duration = 0;
            	
            	dataset.nodes.push({'name': from, 'duration': 10}); // add root node {name: my-phone-number}
            	
            	nestedData.forEach(function (d) {
            		duration = d3.sum(d.values, function(e) {
            			return e.values;
            		}); 
            		length = dataset.nodes.push({'name' : d.key, 'duration': duration}); // push node {name: phone-number}, returns new length
            		dataset.links.push({'source': 0 /* root node*/ , 'target': --length /*==index of new node*/, 'duration': duration});
            	});
            	
//                console.log("forcedGraph.dataset=", dataset);
            	
            	
            	if(svg[0][0] == null) {
                    svg = d3.select(this)
                        .append('svg')
                        .classed('chart', true)
                        .attr("id", "forceGraph");
                    var container = svg.append('g').classed('container-group', true);
                    container.append('g').classed('chart-group', true);
//            	} // if (svg == null)
            	
                    
                svg.transition().duration(duration).attr({width: width, height: height});
                svg.select('.container-group').attr({transform: 'translate(' + margin.left + ',' + margin.top + ')'});
    				
                var color = d3.scale.category20();
                
                var distance = d3.scale.linear()
                	.domain([d3.min(dataset.links, function(d) {
                		return d.duration;
                	}), d3.max(dataset.links, function(d) {
                		return d.duration;
                	})])
                	.range([400, 150]);
                
                var nodeSize = d3.scale.linear()
            		.domain([d3.min(dataset.nodes, function(d) {
            			return d.duration;
            		}), d3.max(dataset.nodes, function(d) {
            			return d.duration;
            		})])
            		.range([10, 100]);

                var force = d3.layout.force()
            		.nodes(dataset.nodes)
            		.links(dataset.links)
            		.size([chartW, chartH])
//            		.linkDistance(400)
            		.linkDistance(function(d) {
//            			console.log("linkDistance:",d.duration, distance(d.duration)); 
            			return distance(d.duration);
            		})
            		.charge([-400])
            		.start();
                
                var links = svg.select('.chart-group').selectAll("line")
                	.data(dataset.links)
                	.enter()
                	.append("line")
                	.style("stroke", "#ccc")
                	.style("stroke-width", 1);
                
                var nodesgroup = svg.select('.chart-group').selectAll('g.nodes-group')
                	.data(dataset.nodes)
                	.enter()
                	.append('g')
                	.classed('nodes-group', true)
                	.call(force.drag);
                
                var node = nodesgroup.append("circle")
                	.attr("r", function(d) {
//                		console.log("nodeSize:", d);
                		return nodeSize(d.duration);
                	})
                	.style("fill", function(d,i) {
                		return color(i);
                	});
                	
                
             // add the text 
                var labels = nodesgroup.append("text")
                	.text(function(d) { return d.name; })
                	.attr("x", function(d) { return nodeSize(d.duration)/-2; });
                
                force.on("tick", function() {
                	
                	links.attr("x1", function(d) { return d.source.x; })
                		.attr("y1", function(d) { return d.source.y; })
                		.attr("x2", function(d) { return d.target.x; })
                		.attr("y2", function(d) { return d.target.y; });
                	 
//                	nodesgroup.attr("cx", function(d) { return d.x; })
//                		.attr("cy", function(d) { return d.y; });
                	nodesgroup.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
                	
                });
                
                
            	} // if (svg == null)
            	
                
                
            } // data !== undefined
            
        }); // selection
        
    } // end createGraph
//    exports.width = function(_x) {
//        if (!arguments.length) return width;
//        width = parseInt(_x);
//        return this;
//    };
//    exports.height = function(_x) {
//        if (!arguments.length) return height;
//        height = parseInt(_x);
//        duration = 0;
//        return this;
//    };
//  
    return createGraph;
};