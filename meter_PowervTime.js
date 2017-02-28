//========================== GLOBALS ==============================
var data = {
	"json": {},
	read_in: function(incoming_json) {
		this.json = incoming_json                                        // pointer to received JSON
	},
	get_joint_activity_power() {
		var our_data = this.json;
		var activity_power_v = [];
		_.each(our_data, function(hh){
			//NOTE: I don't know why the time format libraries have to be different below, but it works
			var dateParse = d3.time.format("%Y-%m-%d %H:%M:%S").parse  // Date format from JSON (to make a DATE object)
			var dateFormat = d3.timeFormat("%Y-%m-%d %H:%M")  //(to make a an object without seconds)
			//var dateParse = d3.timeFormat("%Y-%m-%d %H:%M")  //WITHOUT SECONDS!!! Rounded down to the nearest minute!
			var time_v = []; //not Date objects but strings
			for (var i = 0; i < hh.readings[0].time.length; i++) {
				time_v.push(dateFormat(dateParse(hh.readings[0].time[i])));
			}
			var watt_v = hh.readings[0].Watt;
			var time, time_i, watt, activity;
			_.each(hh.users, function(user) {
				_.each(user.activities, function(act) {
					time = dateFormat(dateParse(act.dt_activity));
					time_i = time_v.indexOf(time);
					if ((time_i >= 0) && (act.category != null) ){
						watt = +watt_v[time_i]; //number, not string :)
						if (watt > 20 && watt <= 5000) {
							//var y = watt;
							var y = get_function_of_power(act.dt_activity, hh.readings[0].time, hh.readings[0].Watt, 10);
							// if (y) {
								activity = act;
								activity['dt_activity'] = dateParse(act.dt_activity);//IMPORTANT!!! This is a DATE object (time as a variable is not, it is a truncated thing)
								activity['abs_minutes'] = get_minutes(activity['dt_activity']);
								activity['watt'] = y; 
								//activity['watt'] = get_function_of_power(act.dt_activity, hh.readings[0].time, hh.readings[0].Watt);
								activity['metaID'] = user.metaID;
								activity['hhID'] = hh.hhID;
								activity['category'] = (act.category == "")?"other_category":act.category; //assigns default category
								activity_power_v.push(act);
						//}
					}
					}
				})
			})
		})
		return activity_power_v;
	},
	get_joint_activity_from_dict() {
		var our_data = this.json;
		var activity_power_v = [];
		var keys = Object.keys(data['act_dict']);
		_.each(our_data, function(hh){
			//NOTE: I don't know why the time format libraries have to be different below, but it works
			var dateParse = d3.time.format("%Y-%m-%d %H:%M:%S").parse  // Date format from JSON (to make a DATE object)
			var dateFormat = d3.timeFormat("%Y-%m-%d %H:%M")  //(to make a an object without seconds)
			//var dateParse = d3.timeFormat("%Y-%m-%d %H:%M")  //WITHOUT SECONDS!!! Rounded down to the nearest minute!
			var time_v = [];
			for (var i = 0; i < hh.readings[0].time.length; i++) {
				time_v.push(dateFormat(dateParse(hh.readings[0].time[i])));
			}
			var watt_v = hh.readings[0].Watt;
			var time, time_i, watt, activity;
			var hh_count, mid_count;
			_.each(hh.users, function(user) {
				_.each(user.activities, function(act) {
					time = dateFormat(dateParse(act.dt_activity));
					time_i = time_v.indexOf(time);
					if ((time_i >= 0) && (act.category != null) ){
						watt = +watt_v[time_i]; //number, not string :)
						if (keys.indexOf(act.idActivities) >= 0) { //if this meta
							if (watt > 20 && watt <= 5000) {
								//var y = watt;
								var y = get_function_of_power(act.dt_activity, hh.readings[0].time, hh.readings[0].Watt, 1); //cannot put zero, since we acts have seconds, and el. readings might not
								if (y) {
									activity = act;
									activity['dt_activity'] = dateParse(act.dt_activity);//IMPORTANT!!! This is a DATE object (time as a variable is not, it is a truncated thing)
									//Also important: this will have seconds. As opposed to hh.readings[0].time, which are minute by minute
									activity['abs_minutes'] = get_minutes(activity['dt_activity']);
									activity['watt'] = y;
									activity['metaID'] = user.metaID;
									activity['hhID'] = hh.hhID;
									//activity['category'] = (act.category == "")?"other_category":act.category; //assigns default category
									//activity['category'] = data['act_dict'][act.idActivities].context
									activity['category'] = data['act_dict'][act.idActivities].activity.length ? data['act_dict'][act.idActivities].activity[0] : "OTHER";
									activity_power_v.push(act);
								}
							}
						}
					}
				})
			})
		})
		return activity_power_v;
}
}


var width = {
	'graph': 	500,
	'canvas':   800
}
var height = {
	'graph': 	300,
	'canvas':   600 
}
var margins = {
	'canvas_top':   20,
	'canvas_left':  20,
	'graph_top':    20,
	'graph_left':   120
}
// ########  Read, Prepare the data, call graphs
var apiurl = 'getHHdata.php';
d3.json(apiurl, function(error, json) {
	if (error){ console.log(error) } //are we sure if don't want this to be an IF/ELSE?
	data.read_in(json);


	d3.json("data.json", function(error, json) {
	if (error){ console.log(error) } //are we sure if don't want this to be an IF/ELSE?
		data['act_dict'] = json;

	//prepare data in the required format
	//x = data.get_joint_activity_power(); //activity_power
	x = data.get_joint_activity_from_dict()
	//==========prepare graph============
	var graph_g = prepare_graph_area();


	//==========set scales============
	scaleX = d3.scaleLinear()
				.domain([0, 60*24])
				.range([0, width.graph]);
	var ext = d3.extent(x, function(d) { return d.watt })//, to set domain of y as [ext[0], ext[1]]
	scaleY = d3.scaleLinear()
				.domain([ext[0], ext[1]]) 
				.range([height.graph, 0]);

	//=========draw background colour=========
	graph_g.append('rect')
			.attr("x", 0)
            .attr("y", 0)
            .attr("width", width.graph)
            .attr("height", height.graph)
            .attr("fill", "white")
            //.attr("fill", "#FFFCF3")


	//=========draw axes=========
	var y_ticks = [1000, 2500, 5000];
	//var y_ticks = [1e1,1e2,1e3,5e3,1e4];
	//var x_labels_loc = ['00 00', '03 00', '06 00', '09 00', '12 00', '15 00', '18 00', '21 00', '24 00'];
	var x_labels_loc = ['06 00', '12 00', '18 00']
	var x_ticks = get_tick_locs(x_labels_loc);
	add_axes(graph_g, width.graph, height.graph, scaleX, scaleY, x_ticks, y_ticks)


	//this is done so that entertainment is drawn on top of the other points
	var y = []
	_.each(x, function (d) {if (d.category != 'ENTERTAINMENT') y.push(d)})
	_.each(x, function (d) {if (d.category == 'ENTERTAINMENT') y.push(d)})
	x = y

	
	//how many hhid, mids, and acts there are
	hh_unique = [],
		meta_unique = [];
	var	hhid, mid;
	_.each(x, function(d){
		hhid = d['hhID']
		mid = d['metaID']
		if (hh_unique.indexOf(hhid) == -1) {
			hh_unique.push(hhid)
		}
		if (meta_unique.indexOf(mid) == -1) {
			meta_unique.push(mid)
		}
	})

	//==========draw data============
	var my_circles = graph_g.append('g')
						.attr('id', 'my_circles');
	var activities = my_circles.selectAll('g')
							.data(x)
							.enter()
							.append('g')
	activities.append('circle')
			  .attr('cx', function(d) {return scaleX(d.abs_minutes)})
			  .attr('cy', function(d) {return scaleY(d.watt)})// (scaleY.range()[1] - scaleY(d.watt))})
			  .attr('r', 2)
			  .attr('class', function(d) {return d.category})
			  .attr('opacity', 1)










	//=========legend=========
	append_legend(graph_g, x);


	//=========additional graph effects=========
	var tooltip = d3.select('body').append('div').attr("class", "tooltip");
	activities.selectAll('circle')
				.on('click', function(d) {
					console.log(d)
				})
				.on("mouseover", function(d) {
					tooltip.transition()
					.duration(200)
					.style("visibility", "visible")
					.style("opacity", .9);
					tooltip.html(toolbox_label(d))
					.style("left", (d3.event.pageX + 5) + "px")
					.style("top", (d3.event.pageY - 28) + "px")
					})
				.on("mouseout", function(d) {
					tooltip.transition()
					.duration(1500)
					.style("opacity", 0)
					.style("border", "none")
					})


	 })



})


function add_axes(graph_g, width, height, scaleX, scaleY, x_ticks, y_ticks) {

	//=========== X AXIS ============
	//MAIN AXIS
	var xAxis_main = d3.axisBottom()
	    		  .tickValues(x_ticks)
	    		  .tickFormat(function(d){return format_abs_time(d)})
	    		  .scale(scaleX);	
	graph_g.append("g")
			.attr("id", "xaxis")
	   		.attr("class", "axis_power")
	   		.attr("transform", "translate(0," + height + ")")
	    	.call(xAxis_main);
	d3.select("#xaxis")
		.append('text')
		.attr("transform", "translate(" + (width/2) + ", 43)")
		.attr("text-anchor", "middle")
		.text('Time of Day')

	//SECONDARY AXIS
  	// graph_g.append("g")
   // 		.attr("class", "axis_power")
   //  	.call(d3.axisTop()
	  // 			.tickValues(x_ticks)
	  // 			.tickFormat("")
	  // 			.scale(scaleX)
	  // 	);

    // //GRID
    // _.each(y_ticks, function(loc, i) {
    // 	if (i != 0 && i != y_ticks.length-1) {
	   //  	graph_g.append("g")
	   // 				.attr("class", "grid")
	   // 				.attr("transform", "translate(0, " + scaleY(loc) + ")")
	   //  			.call(d3.axisBottom()
			 //  			.tickValues("")
			 //  			.tickFormat("")
			 //  			.scale(scaleX)
		  // 	);
	   //  }
    // })

    //=========== Y AXIS ============
	//MAIN AXIS
	var yAxis = d3.axisLeft()
					.tickValues(y_ticks)
	    			.ticks(10) 
	    			.tickFormat(d3.format("0.2r"))
	    			.scale(scaleY);	
	graph_g.append("g")
			.attr("id", "yaxis")
			.attr("class", "axis_power")
	    	.call(yAxis);
	d3.select("#yaxis")
		.append('text')
		.attr("transform", "translate(-50," + (height/2) +  "), rotate(-90)")
		.attr("text-anchor", "middle")
		.text('Power (Watt)')

	//SECONDARY AXIS
  	// graph_g.append("g")
   // 		.attr("class", "axis_power")
   // 		.attr("transform", "translate(" + width + ",0)")
   //  	.call(d3.axisRight()
	  // 			.tickValues(y_ticks)
	  // 			.tickFormat("")
	  // 			.scale(scaleY)
	  // 	);

    // //GRID
    // _.each(x_ticks, function(loc, i) {
    // 	if (i != 0 && i != x_ticks.length-1) {
	   //  	graph_g.append("g")
	   // 				.attr("class", "grid")
	   // 				.attr("transform", "translate(" + scaleX(loc) + ",0)")
	   //  			.call(d3.axisRight()
			 //  			.tickValues("")
			 //  			.tickFormat("")
			 //  			.scale(scaleY)
		  // 	);
	   //  }
    // })
}



function get_minutes(time) {
	var hour_format = d3.timeFormat('%-H'),
	 	minute_format = d3.timeFormat('%-M');
	var absolute_minutes = +hour_format(time)*60 + (+minute_format(time));
	return absolute_minutes;
}

function format_abs_time(time) {
	var hours = Math.round(time/60),
	minutes = time - hours*60;
	var d = new Date(0, 0, 0, hours, minutes); //a hack that works
	var f = d3.timeFormat("%H:%M");
	return f(d);
}

function get_tick_locs(loc_v) {
	var ticks = []; //in absolute time (minutes starting from midnight)
	var minutes;
	_.each(loc_v, function(loc) {
		minutes = +loc.substr(0,2)*60 + (+loc.substr(2,3));
		ticks.push(minutes);
	})
	return ticks;
}



function append_legend(graph_g, x) {
	var legend_height = 120,
		legend_width = 100;
	//create group and move it to where we want the legend to be
	var my_legend_g = graph_g.append('g')
							 .attr('id', 'my_legend')
							 //.attr("transform", "translate(10," + (height.graph - legend_height - 10) + ")")
							 .attr("transform", "translate(10, 10)")
							 .style('opacity', "1")
    //append background rec
	// my_legend_g.append('rect')
	// 		.attr("x", 0)
 //            .attr("y", 0)
 //            .attr("width", legend_width)
 //            .attr("height", legend_height)
 //            .attr("fill", "white")
    //use d3's scaleBand domain feature to create a list of all categories present in the data (yes, there's probably a better way of doing this...)
	var	myscale = d3.scaleBand()
					.domain(x.map(function(d) { return d.category }))
	//bind the categories each to their own group (g) objects, and distribute them in the allocated space (rather ad hoc-ly)
	var legend = my_legend_g.selectAll('g')
							.data(myscale.domain())
							.enter()
							.append('g')
							.attr('transform', function(d, i){ 
								return 'translate(10,' + (i*14 + 10) + ')'
							})
	//Dictionary of what to call the entries
	var ActionCategoryDict = {'TRAVEL': 'Travel', 'FOOD': 'Food', 'HOUSEHOLD': 'Household care', 'PERSONAL':'Personal', 'OTHER':'Other', 'WORK': 'Work', 'CARE': 'Care for others', 'ENTERTAINMENT': 'Recreation'};

	//the actual legend						
	legend.append('circle')
			  .attr('r', 5)
			  .attr('class', function(d) {return d}) 
  	legend.append('text')
  		.attr('x', 8)
  		.attr('y', 4)
  		.text(function(d) {return ActionCategoryDict[d]}) 
  	
  	//======== extra funky features =======
  	//making it fade almost into the background when the mouse is not on it
  	// var transition_length = 100;
  	// my_legend_g.on('mouseenter', function(d){ //use my_legend_g here, because it includes the white background rect
  	//   			my_legend_g.transition().duration(transition_length).style("opacity", "1")
  	// 		})
  	// 		.on('mouseleave', function(d){	
  	//   			my_legend_g.transition().duration(transition_length).style("opacity", "0.2")
  	// 		})

    //making the circles of the given type fade/stand out
  	legend.selectAll('circle')
  	      .on('click', function(d) {
  	      	d3.select('#my_circles') //we need to know that this id is for the group that encompasses all the data circles
  	      	  .selectAll("circle")
  	      	  .each(function(d2) {
  	      	  	if (d2.category != d) { this.style.opacity = 0.1; }
  	      		else { this.style.opacity = 0.9; }
  	      	})
  		})
}



function prepare_graph_area() {
	var canvas = d3.select('#canvas') //a Pointer to newly created svg element
								 .append('svg')
								 .attr('width', width.canvas)
								 .attr('height', height.canvas)
								 .attr('transform', 'translate(' + margins.canvas_left + ', ' + margins.canvas_top + ')');
	var graph = d3.select('svg').append('g')
										.attr('id', 'graph')//to make it easier to identify using the 'elements' on the webpage
										.attr('transform', 'translate(' + margins.graph_left + ', ' + margins.graph_top + ')');
	return graph;
}


function toolbox_label(d){
		// populate the activity box
		var html = formatDayTime(d.dt_activity)
		var enjoy = "<img src=img/enjoy_"+((d.enjoyment!='undefined')?d.enjoyment:"0")+".png width='20px' height='20px'>"
		var location = "<img src=img/location_"+((d.location!='undefined')?d.location:"0")+".png width='20px' height='20px'>"
		html += '<br>'+d.activity+' '+location+' '+enjoy
		return html
	} // toolbox label

function formatDayTime(date){
	// Return day and time in format "Thu, 9:20"
	var seconds = date.getSeconds()
	var minutes = date.getMinutes()
	var hour = date.getHours()

	var year = date.getFullYear()
	var months = ['JAN','FEB','NAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
	var month = date.getMonth() // beware: January = 0; February = 1, etc.
	var day = date.getDate()

	var daysOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
	var dayOfWeek = date.getDay() // Sunday = 0, Monday = 1, etc.
	var milliSeconds = date.getMilliseconds()

	var pad = '00'

	return daysOfWeek[dayOfWeek] + ', ' + hour + ':' + (pad + minutes).slice(-pad.length)
} // end formatDayTime


function get_function_of_power(point_in_time, time_vector, watt_vector, radius) {
	//Finds all readings within radius of the 'point in time', puts it into 'temp'. Currently outputs mean of temp, but can make it any function of temp
	//NB point in time will have non-zero seconds, elements of time vector will not.
	//Radius is a vector of minutes to left, minutes to right
	//Each time has to be a string of the format given in dateParse, otherwise will not work
	//Also assume time_vector and watt_vector are ordered so same index would give time and corresponding watt
	var dateParse = d3.time.format("%Y-%m-%d %H:%M:%S").parse;
	var p = dateParse(point_in_time);
	//1. Find all the readings within R (radius) minutes
	//2. Get average watt reading within bounding set
	var temp = [], t;
	for (var i = 0; i < time_vector.length; i++) {
		t = dateParse(time_vector[i]);
		if (typeof(radius) == "number") { //means that only a single number is given, have to look radius to left and radius to right
			if (Math.abs(t-p)<=(radius*60*1000)) {temp.push(+watt_vector[i]);}
		} else if (typeof(radius) == "object") {
			if ( ((t-p)<=0 && (t-p)>=(radius[0]*60*1000)) || ((t-p)>=0 && (t-p)<=(radius[1]*60*1000) )) {temp.push(+watt_vector[i]);}
		}
	}
	if (temp) {
		out = d3.mean(temp);
	} else {
		out = false;
	}
	return out;
}
