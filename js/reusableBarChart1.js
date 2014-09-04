d3.custom = {};

d3.custom.barChart = function module() {
    var margin = {top: 20, right: 20, bottom: 100, left: 50},
        width = 960,
        height = 500,
        gap = 0,
        ease = 'cubic-in-out';
    var duration = 500;

    // prepare db data for usage in bar-chart
    var prepareData = function(data, service) {
    	var parseDate = d3.time.format("%Y-%m-%d").parse; // date parse function
    	
    	var nestedData = d3.nest() // nest the data according to [date] and sum up service duration
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
	            });
	        })
	        .entries(data);

	    // rebuild array of objects
	    nestedData.forEach(function(d) { // set default values
	        d.date = parseDate(d.key);
	        d["TEL"] = 0; d["SMS"] = 0; d["DATA"] = 0; d["WHATSAPP"] = 0; // initialize properties
	        d.values.forEach(function(e) {
	            if (typeof e.values === "number") {
	                d[e.key] = e.values;
	            } else {
	                d[e.key] = 0;
	            }
	        });
	        delete(d.key);
	        delete(d.values);
	    });
	    
	    return nestedData;
    };
    
    
    return function(_selection) {
        _selection.each(function(_data) {

        	var data = _data["data"];
        	var service = _data["service"];
        	var svg = d3.select("#barChart"+service); // prevent reinitialisation of chart
        	var container = undefined;
//        	console.log("svg=", svg[0][0] != null);
        	
        	data = prepareData(data, service);
            // console.log("reusableBarChart.data=", data);

            var chartW = width - margin.left - margin.right,
                chartH = height - margin.top - margin.bottom;

            var gapSize = 2; //xScale.rangeBand() / 100 * gap; // gap size = 1/100 der Breite eines Balken
            var barWidth = 10;
            if (data && data.length > 0) {
            	barWidth = d3.max([10, d3.round((chartW / data.length - gapSize*2) / 2)]); // Breite eines Balken = rangeBand - gap size
            }
            
            
            var xDomain = [];
            data.forEach(function(d) { xDomain.push(d.date); })
//            xDomain = xDomain.sort(function (a, b) {
//            	if (a.getTime() < b.getTime()) {
//            		return -1;
//            	} else if (a.getTime() > b.getTime()) {
//            		return 1;
//            	} else {
//            		return 0;
//            	}            	
//            });
            // max value for y-Domain
            var yDomain = [];
            data.forEach(function(element, index, array) {
                yDomain.push(element[service]);
            });

            
            // SCALES & DOMAINS
            var xScale = d3.time.scale()
            	.range([0, chartW])
            	.domain([xDomain[0], xDomain[xDomain.length-1]]);            
//            	.domain(xDomain);
            
            var yScale = d3.scale.linear()
                .range([chartH, 0])
//            	.domain([0, d3.max(data, function(d, i){ return d; })])
                .domain([0, d3.max(yDomain)]);

            // AXES
            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .ticks(d3.time.days);

            var yAxis = d3.svg.axis()
                .scale(yScale)
                .orient('left');

            var tooltip = d3.select("#BCtooltip" + service);
            
//            var zoom = function() {
//                chart.select(".x-axis-group.axis").call(xAxis);
//                chart.select(".y-axis-group.axis").call(yAxis);
//                chart.selectAll(".chart-group bar").attr(transform, "translate(" + d3.event.translate[0] + ",0)scale(" + d3.event.scale + ", 1)");
//            };
            
            if(svg[0][0] == null) {
                svg = d3.select(this)
                    .append('svg')
                    .classed('chart', true)
                    .attr("id", "barChart"+service);
//                    .call(d3.behavior.zoom().x(xScale).scaleExtent([1, 8]).on("zoom", zoom));
                
                container = svg.append('g').classed('container-group', true);                
                container.append('g').classed('chart-group', true);
                container.append('g').classed('x-axis-group axis', true);
                container.append('g').classed('y-axis-group axis', true);
            }

            svg.transition().duration(duration).attr({width: width, height: height});
            svg.select('.container-group').attr({'transform': 'translate(' + margin.left + ',' + margin.top + ')'});

            svg.select('.x-axis-group.axis')
//            svg.select('.x-axis-group.axis')
                .transition()
                .duration(duration)
                .ease(ease)
                .attr({"transform": "translate(0," + (chartH) + ")"})
                .call(xAxis)
                .selectAll("text")
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", "-.55em")
                .attr("transform", "rotate(-90)" );

            svg.select('.y-axis-group.axis')
                .transition()
                .duration(duration)
                .ease(ease)
                .call(yAxis);
            // Achsenbeschriftung
//            svg.select('.y-axis-group')
//                .append("text")
//			      .attr("transform", "rotate(-90)")
//			      .attr("y", 6)
//			      .attr("dy", ".71em")
//			      .style("text-anchor", "end")
//			      .text("Value ($)");
            
            
            

            var bars = svg.select('.chart-group')
                .selectAll('.bar')
                .data(data);
            
            bars.enter()
                .append('rect')
                    .classed('bar', true)
                    .attr({
                    	x: function(d) { 
                    		return d3.round(xScale(d["date"])-barWidth); },
                    	y: function(d) { 
                    		return d3.round(yScale(d[service])); },
                        width: barWidth *2,                        
                        height: function(d) { 
                        	return d3.round(chartH - yScale(d[service])); }
//                    })
//                .append("svg:title")
//                    .text(function(d, i) {
//                        return service + " " + d[service];
                    });

            bars.transition()
                .duration(duration)
                .ease(ease)
                .attr({
                	x: function(d) { 
                		return d3.round(xScale(d["date"])-barWidth); },
                	y: function(d) { 
                		return d3.round(yScale(d[service])); },
                    width: barWidth *2, //function(d) { return xScale(d["date"]); },                        
                    height: function(d) { 
                    	return d3.round(chartH - yScale(d[service])); }
                });
            
            bars.exit().transition().style({opacity: 0}).remove();


           
            // mouse over effects
            bars.on('mouseover', function(d){
            	if (service == "TEL") {
	            	var date1 = new Date(d.service * 1000);
	            	var date2 = new Date(0);
	            	var offset = date1.getTimezoneOffset() *60000;
	            	var date = new Date(date1.getTime() - date2.getTime() + offset);
	            	var format = d3.time.format("%H:%M:%S");
	            	tooltip.html("<p>Date: " + d3.time.format("%Y-%m-%d")(d.date) + "<br/>Duration: " + format(date) +"</p>").style("visibility", "visible");
            	} else if (service == "SMS") {
            		tooltip.html("<p>Date: " + d.date + "<br/># Messages: " + d.service +"</p>").style("visibility", "visible");
            	} else if (service == "WHATSAPP") {
            		tooltip.html("<p>Date: " + d.date + "<br/># Characters: " + d.service +"</p>").style("visibility", "visible");
            	} else if (service == "DATA") {
            		tooltip.html("<p>Date: " + d.date + "<br/>Datavolume: " + d3.format(",f")(d.service).replace(",", ".") +" KB</p>").style("visibility", "visible");
            	}
            });
            bars.on('mouseout', function(d){ 
            	tooltip.html("<p>&nbsp;<br/>&nbsp;</p>").style("visibility", "hidden"); 
            });
            

        }); // end selection.forEach
    }

};