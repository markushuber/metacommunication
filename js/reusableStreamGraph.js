
d3.custom.streamGraph = function module() {
    var margin = {top: 20, right: 50, bottom: 100, left: 50},
        width = 960,
        height = 500,
        gap = 0,
        ease = 'cubic-in-out';
    var duration = 500;

    var prepareData = function(data, service) {
    	var parseDate = d3.time.format("%Y-%m-%d").parse; // dateformat
    	
//    	console.log("reusableStreamGraph.data", service, data);
    	var dateSet = {}; // build set with all dates occurring in the data
    	// create a list with all x-Axis values
    	var buffer = [];
    	if (data) {
    		for (var i = 0; i < data.length; i++) {
    			if (data[i].service == service) {
    				buffer.push(data[i]);
    			}
    		}
    	}
    	data = buffer;
    	
    	if (data !== undefined && data.length > 0) {
        	var dateArray = [];
        	data.forEach(function(d) {
        		dateArray.push(d.date);
        	});
        	dateSet = d3.set(dateArray);
//        	console.log("dateSet=", dateSet);
    	}
    	
    	var nestedData = d3.nest() // nest the data according [to], [date] and sum up service
            .key(function(d) { return d.to; }).sortKeys(d3.ascending)
            .key(function(d) { return d.date; }).sortKeys(d3.ascending)
            .key(function(d) { return d.service; })
            .rollup(function(d) {
                return d3.sum(d, function(g) {
                	if (service == "DATA") {
                		return g.datavolume;
                	} else if (service == "TEL" || service == "SMS") {
                		return g.duration;
                	} else if (service == "WHATSAPP") {
                		return g.duration;
                	}
                })
            })
            .entries(data);
//        console.log("reusableStreamGraph.nestedData1=", nestedData);
        
        
    	// Attention: Streamgraph required a value for each x-Axis entry. So one stream cannot be set and another not. Fill missing entries.
        nestedData.forEach(function(d) {
        	// d.key = [to] phone number
        	var dateSetCopy = d3.set(dateSet.values().concat()); // work on copy
        	
        	d.values.forEach(function(e) { // remove existing date entries
        		// e.key = date as string
        		var containsService = false;
        		e.values.forEach(function (f) {
        			// f.key = service
        			if (f.key == service) {
        				containsService = true;
        			}
        		});
        		if (containsService) {
        			dateSetCopy.remove(e.key);
        		}
        	});
        	if (!dateSetCopy.empty()) { // append 0 values for missing date entries
        		dateSetCopy.forEach(function(e) {
        			d.values.push({key: e, values: [{ key: service, values: 0}]});
//        			console.log("pushed: ", {key: e, values: [{ key: service, values: 0}]});
        		});
        	}
        	d.values.sort(function(a, b) { // sort the date values ascending
        		if (a.key > b.key) {
        			return 1;
        		} else if (a.key < b.key) {
        			return -1;
        		} else {
        			return 0;
        		}
        	});
        });
//        console.log("reusableStreamGraph.nestedData2=", nestedData);
        
        // rebuild array of objects
        var newData = [];
        nestedData.forEach(function(d) { // streamgraph needs data in the form [{key, x-Axis=date, y-Axis=sum of service usage}]
            var item = [];
            d.values.forEach(function(e) {
            	e.values.forEach(function(f) {
            		if (f.key == service) {
//            			console.log("key=" + d.key + ", date=" + e.key + ", value=" + f.values);
            			item = {
            					key: d.key, // telephone number
            					date: parseDate(e.key), // day
            					value: f.values // connection duration/count
            			};
            			newData.push(item);
            		}
            	});                    
            });
        });
        
        return newData;
    }
    
    
    return function(_selection) {
        _selection.each(function(_data) {

        	var data = _data["data"];
        	var service = _data["service"];
//        	console.log("service=", _data["service"]);
        	var svg = d3.select("#streamGraph"+service); // prevent reinitialisation of chart
//        	console.log("svg=", svg[0][0] != null);

        	var newData = prepareData(data, service);

//            console.log("reusableStreamGraph.newData", service, newData);
        	
            var color = "orange";
            var datearray = [];
            var colorrange = [];

            if (color == "blue") {
              colorrange = ["#045A8D", "#2B8CBE", "#74A9CF", "#A6BDDB", "#D0D1E6", "#F1EEF6"];
            }
            else if (color == "pink") {
              colorrange = ["#980043", "#DD1C77", "#DF65B0", "#C994C7", "#D4B9DA", "#F1EEF6"];
            }
            else if (color == "orange") {
              colorrange = ["#B30000", "#E34A33", "#FC8D59", "#FDBB84", "#FDD49E", "#FEF0D9"];
            }
            strokecolor = colorrange[0];

//            var format = d3.time.format("%Y-%m-%d");
            
            var chartW = width - margin.left - margin.right,
            	chartH = height - margin.top - margin.bottom;
            
            
            var tooltip = d3.select("#SGtooltip" + service);
//                .append("div")
//                .attr("class", "remove")
//                .style("position", "absolute")
//                .style("z-index", "20") // 20
//                .style("visibility", "hidden")
//                .style("top", 0)
//                .style("left", 0);

            var x = d3.time.scale()
                .range([0, chartW]);

            var y = d3.scale.linear()
                .range([chartH-10, 0]);

            var z = d3.scale.ordinal()
                .range(colorrange);

            var xAxis = d3.svg.axis()
                .scale(x)
                .orient("bottom")
                .ticks(d3.time.weeks);

            var yAxis = d3.svg.axis()
                .scale(y);

            var yAxisr = d3.svg.axis()
                .scale(y);

            var stack = d3.layout.stack()
                .offset("silhouette")
                .values(function(d) { return d.values; })
                .x(function(d) { return d.date; })
                .y(function(d) { return d.value; });

            var nest = d3.nest()
                .key(function(d) { return d.key; });

            var area = d3.svg.area()
                .interpolate("cardinal")
                .x(function(d) { return x(d.date); })
                .y0(function(d) { return y(d.y0); })
                .y1(function(d) { return y(d.y0 + d.y); });

			if(svg[0][0] == null) {
                svg = d3.select(this)
                    .append('svg')
                    .classed('chart', true)
                    .attr("id", "streamGraph"+service);
                var container = svg.append('g').classed('container-group', true);
                container.append('g').classed('chart-group', true);
                container.append('g').classed('x-axis-group axis', true);
                container.append('g').classed('y-axis-group-left axis', true);
				container.append('g').classed('y-axis-group-right axis', true);
            } 
			
			
			svg.transition().duration(duration).attr({width: width, height: height});
            svg.select('.container-group').attr({transform: 'translate(' + margin.left + ',' + margin.top + ')'});
                
/*            
            var svg = d3.select(".chart").append("svg")
                .attr("width", chartW)
                .attr("height", chartH)
              .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
*/
            
            
            
              if (newData.length > 0) { // start only if data is provided
	            	  
	              var nestedEntries = nest.entries(newData);
	//            	  console.log("nestedEntries=", nestedEntries);
	            	  
	              var layers = stack(nestedEntries);
	
	              x.domain(d3.extent(newData, function(d) { return d.date; }));
	              y.domain([0, d3.max(newData, function(d) { return d.y0 + d.y; })]);
	
	              svg.select('.chart-group').selectAll(".layer")
	                  .data(layers)
	                .enter().append("path")
	                  .attr("class", "layer")
	                  .attr("d", function(d) { return area(d.values); })
	                  .style("fill", function(d, i) { return z(i); });
	
	
	              svg.select(".x-axis-group.axis")
	                  .attr("transform", "translate(0," + chartH + ")")
	                  .call(xAxis);
	
	              svg.select(".y-axis-group-right.axis")
	                  .attr("transform", "translate(" + chartW + ", 0)")
	                  .call(yAxis.orient("right"));
	
	              svg.select(".y-axis-group-left.axis")
	                  .call(yAxis.orient("left"));
	
	              svg.select('.chart-group').selectAll(".layer")
	                .attr("opacity", 1)
	                .on("mouseover", function(d, i) { // highlight path
	                  svg.selectAll(".layer").transition()
	                  .duration(250)
	                  .attr("opacity", function(d, j) {
	                    return j != i ? 0.6 : 1;
	                })})
	                .on("mousemove", function(d, i) {
	                  mousex = d3.mouse(this);
	                  mousex = mousex[0];
	                  var invertedx = x.invert(mousex);
	                  invertedx = invertedx.getMonth() + invertedx.getDate();
	                  var selected = (d.values);
	                  for (var k = 0; k < selected.length; k++) {
	                    datearray[k] = selected[k].date
	                    datearray[k] = datearray[k].getMonth() + datearray[k].getDate();
	                  }
	
	                  var mouseDate = datearray.indexOf(invertedx);
	                  var duration = 0;
	                  var displayDate = undefined;
	                  if (d.values[mouseDate]) {
	                	  var html = undefined;
	                	  
	                	  if (service == "TEL") {
	                		  var date1 = new Date(d.values[mouseDate].value * 1000);
	                    	  var date2 = new Date(0);
	      	            	  var offset = date1.getTimezoneOffset() *60000;
	      	            	  var date = new Date(date1.getTime() - date2.getTime() + offset);
	      	            	  var format = d3.time.format("%H:%M:%S");
	      	            	
	                		  html = "<p>Date: " + d3.time.format("%Y-%m-%d")(d.values[mouseDate].date) + "<br/>Destination: " + d.key + "<br/>Duration: " + format(date) + "</p>";
	                	  } else if (service == "SMS") {
	                		  html = "<p>Date: " + d3.time.format("%Y-%m-%d")(d.values[mouseDate].date) + "<br/>Destination: " + d.key + "<br/># Messages: " + d.values[mouseDate].value + "</p>";
	                	  } else if (service == "WHATSAPP") {
	                		  html = "<p>Date: " + d3.time.format("%Y-%m-%d")(d.values[mouseDate].date) + "<br/>Destination: " + d.key + "<br/># Characters: " + d.values[mouseDate].value + "</p>";
	                	  } else if (service == "DATA") {
	                		  html = "<p>Date: " + d3.time.format("%Y-%m-%d")(d.values[mouseDate].date) + "<br/>Destination: " + d.key + "<br/>Datavolume: " + d3.format(",f")(d.values[mouseDate].value).replace(",", ".") + " KB</p>";
	                	  }
	                	  
	                	  d3.select(this)
		                  .classed("hover", true)
		                  .attr("stroke", strokecolor)
		                  .attr("stroke-width", "0.5px"), 
		                  tooltip.html(html).style("visibility", "visible");
	                  }
	                  
	                  
	                  
	                })
	                .on("mouseout", function(d, i) {
	                 svg.selectAll(".layer")
	                  .transition()
	                  .duration(250)
	                  .attr("opacity", "1");
	                 
	                  d3.select(this)
	                  .classed("hover", false)
	                  .attr("stroke-width", "0px"), 
	                  tooltip.html( "<p>Date:<br/>Destination:<br/>Duration:</p>" ).style("visibility", "hidden");
	              });
	                
	//              var vertical = d3.select(".chart")
	//                    .append("div")
	//                    .attr("class", "remove")
	//                    .style("position", "absolute")
	//                    .style("z-index", "19")
	//                    .style("width", "1px")
	//                    .style("height", chartH) // "380px"
	//                    .style("top", margin.top) // "10px"
	//                    .style("bottom", margin.bottom) // "30px"
	//                    .style("left", margin.left) // "0px"
	//                    .style("background", "#fff");
	
	//              d3.select(".chart")
	//                  .on("mousemove", function(){  
	//                     mousex = d3.mouse(this);
	//                     mousex = mousex[0] + 5;
	//                     vertical.style("left", mousex + "px" )})
	//                  .on("mouseover", function(){  
	//                     mousex = d3.mouse(this);
	//                     mousex = mousex[0] + 5;
	//                     vertical.style("left", mousex + "px")});
              } // end if newData 
//            });

        });
        
    }
   
};