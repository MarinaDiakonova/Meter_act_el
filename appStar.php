<!DOCTYPE html>
<!-- 
20 May 2017: Phil: Suggestions: 
1) Some descritions are odd ("Device Next", "Leisure TV COmputer"...)
    Change labels from 'description' to 'caption' (i.e. show what people see on the button)
2) Legend should have human friendly labels (care_self -> Caring for oneself)
3) Would be nice to dynamically generate the json input

-->

<head>
    <meta charset="utf-8">
    <title>METER - Activities</title>
    <link rel="stylesheet" type="text/css" href="../css/appStar.css">
    <link rel="stylesheet" type="text/css" href="../css/meter.css">
    <link rel="stylesheet" type="text/css" href="../css/bootstrap.min.css">
    <script src="../libs/d3.min.js"></script>

    <style>
    path {
    stroke: #fff;
    }
    </style>
</head>
<body>
<?php include('../_nav_bar_subfolder.php'); ?>

<script> //========================================================================
var data = {
    "json":{},
    "valuefield":'count',
    read_in: function(incoming_json) {
        this.json = incoming_json
    },

prepare_data_for_starburst:
function() {
   var out = d3.hierarchy(this.json);
   //make a copy of 'count' to 'actual_count', since 'count' will be modified and normalised
   out.eachAfter(function(d){ d.data['actual_count'] = Object.assign({}, d.data)['count'] }) //deep copy

   //uncomment the two normalisations below if want the sum of the siblings to be the same as the parent value
   //this.normalise_siblings(out, this.valuefield);
   //this.normalise_by_parent(out, this.valuefield);
   this.normalise_by_sum_childrens_values(out, this.valuefield);
   out.sum(function(d) { return d.count; });
   //extra: add information to the root
   out.data.description = "Where are you?";
   var tot = 0; var chldn = out.children; for (s = 0; s < chldn.length; s++) {tot+=chldn[s].data['actual_count'];}; out.data['actual_count'] = tot;
   return out
   //root.eachAfter(function(d){ console.log(d.data.name, " ", d.data.size) }) //for printing}
},

normalise_by_parent:
function(root_node, field_value) {
    root_node.eachBefore(function(d){
        if (d.depth > 1){ //depth 0 is the entire json; depth 1 are the first nodes. Hence we start with depth 2, the first of which have valid parents defined
            if (!d.data[field_value]) {
            d.data[field_value] = 0;
            } else {
                if (!d.parent.data[field_value]) {
                d.parent.data[field_value] = 0;
                }
            }
        d.data[field_value] = d.data[field_value]*d.parent.data[field_value];
        }
    })
},

normalise_by_sum_childrens_values:
function(root_node, field_value){
    root_node.each(function(node) {
        if (node.depth > 0) {
            var chldn = node.children;
            if (chldn) {
                var cmlt_ch_value = 0;       
                for (s = 0; s < chldn.length; s++) {
                cmlt_ch_value+=chldn[s].data[field_value];
            }
            node.data[field_value] = node.data[field_value] - cmlt_ch_value;
            }
        }
    })
},

normalise_siblings: 
function(root_node, field_value){ //value field is name of datafield where value is stored
        var cmlt_sib_value = 0;
        var sbls = []; //list of siblings
        var p_node = root_node;
        root_node.each(function(node) {
                if (node.depth > 0) {
                if(node.parent == p_node) {
                sbls.push(node);
                cmlt_sib_value+=node.data[field_value];
                } else {
                if (cmlt_sib_value > 1) {
                for (s = 0; s < sbls.length; s++) {
                sbls[s].data[field_value] = sbls[s].data[field_value]/cmlt_sib_value;
                }
                }
                cmlt_sib_value = node.data[field_value];
                sbls = [];
                sbls.push(node);
                p_node = node.parent;
                }
                }
                })
        if (cmlt_sib_value > 1) {
            for (s = 0; s < sbls.length; s++) {
                sbls[s].data[field_value] = sbls[s].data[field_value]/cmlt_sib_value;
            }
        }
    }
}

starburst = {
initialise:
function(data_in) {
    this.data = data_in;
    //Note: when x and y are global, everything is much faster
    x = d3.scaleLinear()
        .range([0, 2 * Math.PI]);
    y = d3.scaleSqrt()
        .range([0, radius]);
    this.arc = d3.arc()
        .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x0))); })
        .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x1))); })
        .innerRadius(function(d) { return Math.max(0, y(d.y0)); })
        .outerRadius(function(d) { return Math.max(0, y(d.y1)); });
    this.partition = d3.partition();
    //this.colour = d3.scaleOrdinal(d3.schemeCategory20);
},

draw:
function(svg_link) {
    var shapes = svg_link.selectAll("path")
        .data(starburst.partition(starburst.data).descendants())
        .enter()
        .append("path")
        .attr("d", starburst.arc)
        .attr("class", function(d) {return d.data.category})
        .style("fill", function(d) { if (!d.parent) {return 'transparent'} }) //so the central node is white

     //option A: text appears on top of arc; trail not highlighted
     //  var arc_text = svg_link.append('text')
     //                    .attr('class', 'arc_text')
     //  shapes.on("mouseover", function(d){ 
     //          arc_text.text(d.data.description + "\n" + formatNumber(d.data['actual_count']))
     //                      .attr('x', starburst.arc.centroid(d)[0]) //comment out these x and y to place text in center
     //                      .attr('y', (d.parent)?starburst.arc.centroid(d)[1]:0) //for first node, impose y as center (0) rather than
     //        })
     //        .on("mouseout", function(d){ 
     //          arc_text.text('')
     //        })
     // option B: text appears in center, and trail is highlighted

      var central_text = svg_link.append('text')
                        .attr('class', 'arc_text')
      //shapes.on("mouseover", function(d){ central_text.text(d.data.description + "\n" + formatNumber(d.data['actual_count'])) })
      shapes.on("mouseover", function(d){ central_text.text(d.data.description) })
            .on("mouseout", function(d){ central_text.text('') })
            .on('click', starburst.highlight_all)

},

highlight_trail:
function(d) {
    var sequenceArray = d.ancestors().reverse();
    sequenceArray.shift(); // remove root node from the array

    //fade starburst
    d3.selectAll("path")
        .style("opacity", 0.3);        

    // Then highlight only those that are an ancestor of the current segment.
    svg.selectAll("path")
        .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
                })
    .style("opacity", 1);
},

// click:function(d) {
//   node = d;
//   d3.selectAll("path").transition()
//     .duration(1000)
//     .attrTween("d", starburst.arcTweenZoom(d));
// },

highlight_all:
function(d) {
    if (!d.parent) { //if click on center circle
        //fade starburst
        d3.selectAll("path")
            .style("opacity", 1);
    } else {
        //fade starburst
        d3.selectAll("path")
            .style("opacity", 0.3);

        var tuc = d.data['tuc']
            starburst.data.eachAfter(function(g){
                    var this_tuc = g.data['tuc'];
                    if (this_tuc == tuc) {
                    var sequenceArray = g.ancestors().reverse();
                    sequenceArray.shift(); // remove root node from the array 
                    svg.selectAll("path")
                    .filter(function(node) { return (sequenceArray.indexOf(node) >= 0);})
                    .style("opacity", 1);
                    }
                    })
    }
}
}

var width = 600,
    height = 600,
    radius = (Math.min(width, height) / 2) - 10;

var formatNumber = d3.format(",");//,d");

var svg = d3.select("body")
.append("svg")
.attr("width", width)
.attr("height", height)
.attr("class", "centered")
.append("g")
.attr("transform", "translate(" + width / 2 + "," + (height / 2) + ")")
   ;


d3.json("../api/app_usage_hierarchy.json", function(error, json) {
        if (error) throw error;

        //====== read in and prepare data ======
        data.read_in(json);
        var root = data.prepare_data_for_starburst();

        // ====== prepare the starburst ======
        starburst.initialise(root);

        // ====== draw the starburst ======
        logo(svg);
        starburst.draw(svg);

        append_legend(svg);

        });

function logo(graph_g) {
var width = 271;
var my_logo = graph_g.append('g')
.append("svg:image")
    // .attr("transform", "translate(" + width / 2 + "," + (height / 2) + ")")
   .attr('x', -width/2)
   .attr('y',-180)
   .attr('width', width)
   //.attr('height', 220)
   .attr("xlink:href","../img/logo.png")
}

function append_legend(graph_g) {
    var legendList = [
        'care_self',
        'recreation',
        'travel',
        'food',
        'care_other',
        'care_house',
        'work',
        'other_category'
        ];

    var legend_height = 150,
        legend_width = 100;
    //create group and move it to where we want the legend to be
    var my_legend_g = graph_g.append('g')
        .attr('id', 'my_legend')
        .attr("transform", "translate(200," + (legend_height - 30) + ")")
        .style('opacity', "1")

    var myscale = d3.scaleBand()
        .domain(legendList)
        //bind the categories each to their own group (g) objects, and distribute them in the allocated space (rather ad hoc-ly)

    var legend = my_legend_g.selectAll('g')
        .data(myscale.domain())
        .enter()
        .append('g')
        .attr('transform', function(d, i){ 
                return 'translate(10,' + (i*15 + 10) + ')'
                        })

        // Legend
        legend.append('circle')
        .attr('r', 7)
        .attr('class', function(l) {return l}) 

        legend.append('text')
        .attr('x', 10)
        .attr('y', 4)
        .text(function(l) {return l}) 
        }
d3.select(self.frameElement).style("height", height + "px");
</script>

</body>
