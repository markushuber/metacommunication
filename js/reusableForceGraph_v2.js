
d3.custom.forceGraph = function () {
    var margin = {top: 20, right: 50, bottom: 100, left: 50},
        width = 960,
        height = 900;
    var smsMultiplicator = 60; // 1 SMS is equal to 60 seconds Telephone conversation
    
    
    function prepareData(data, service) {
    	var nodes = d3.map();
    	var dataset = { nodes : [], links : []};
    	
    	var from = d3.map();
    	data.forEach(function(d) {
    		if (!from.has(d.from)) {
    			from.set(d.from, []);
    		}
    		from.get(d.from).push(d);
    	});
    	
    	from.keys().forEach(function(phoneNumber) {
    		var phoneData = from.get(phoneNumber);
    		
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
                .entries(phoneData);
    		
    		nestedData.forEach(function (d) {
        		var duration = d3.sum(d.values, function(e) {
        			return e.values;
        		}); 
//        		index = dataset.nodes.push({'name' : d.key, 'duration': duration}); // push node {name: phone-number}, returns new index
        		if (nodes.has(d.key)) {
        			nodes.set(d.key, nodes.get(d.key) + duration);
        		} else {
        			nodes.set(d.key, duration);
        		}
        		dataset.links.push({'source': phoneNumber /* root node*/ , 'target': d.key /*==index of new node*/, 'duration': duration});
        	});
    		
    		if (!nodes.has(phoneNumber)) {
    			nodes.set(phoneNumber, 0);
    		}
    	}); // forEach phoneNumber
    	
    	var keys = nodes.keys();
    	var length = 0;
    	for (var i = 0; i < keys.length; i++) {
    		length = dataset.nodes.push({"name" : keys[i], "duration" : nodes.get(keys[i])});
//    		console.log("dataset.nodes.push()", keys[i], nodes.get(keys[i]));
    		for (var j = 0; j < dataset.links.length; j++) {
//    			console.log(" dataset.links[]", j, dataset.links[j]);
    			if (dataset.links[j]['source'] == keys[i]) {
    				dataset.links[j]['source'] = length-1;
    			}
    			if (dataset.links[j]['target'] == keys[i]) {
    				dataset.links[j]['target'] = length-1;
    			}
    		} // end for links.length
    	} // end for keys.length
    	
    	return dataset;
    }
    
    
    function createGraph(_selection) {
        _selection.each(function(_data) {

        	var data = _data["data"];
           	var svg = d3.select("#forceGraph"); // prevent reinitialisation of chart
//        	console.log("forceGraph.data=", data);
                        
            if (data && data.length > 0)
            {
            	var dataset = { nodes : [], links : []};
            	
            	dataset = prepareData(data);
//            	console.log("dataset=", dataset);
            	
            	var chartW = width - margin.left - margin.right,
             		chartH = height - margin.top - margin.bottom;
            	 
            	if(svg[0][0] != null) {
                	svg = d3.select(this).selectAll('*').remove();
                }
            	
            	svg = d3.select(this)
                        .append('svg')
                        .classed('chart', true)
                        .attr("id", "forceGraph");
            	
                var container = svg.append('g').classed('container-group', true);
                container.append('g').classed('chart-group', true);
                    
                svg.transition().duration(500).attr({width: width, height: height});
                svg.select('.container-group').attr({transform: 'translate(' + margin.left + ',' + margin.top + ')'});
    				
                var color = d3.scale.category20();
                
                var distance = d3.scale.linear()
                	.domain([d3.min(dataset.links, function(d) {
                		return d.duration;
                	}), d3.max(dataset.links, function(d) {
                		return d.duration;
                	})])
                	.range([300, 150]);
                
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
                
                function dragstart(d) {
	          		d3.select(this).classed("fixed", d.fixed = true);
	          	}
            	
            	function dblclick(d) {
	              	d3.select(this).classed("fixed", d.fixed = false);
	          	}
            	
            	var drag = force.drag()
          		.on("dragstart", dragstart);
                
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
                	.on("dblclick", dblclick)
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
                
                function resize(e){
                	var offset = 100; // var footer = 40; var legend = 60;
                	if (!d3.select("ul.nav").classed("hidden")) {
                		offset += 43; // navigation tabs
                	}
                	var height = window.innerHeight - offset;
                	var width = d3.min([svg[0][0].parentElement.clientWidth, window.innerWidth]);
//                    console.log("resize (width, height)", width, height);
                    
                    // set attrs and 'resume' force 
                    svg.attr('width', width);
                    svg.attr('height', height);
                    force.size([width, height]).resume();
                }
                
                d3.select("#right").on('customResize', resize); 
                d3.select(window).on('resize', resize);
               
            } // data !== undefined
        }); // selection
        
    } // end createGraph

    return createGraph;
};