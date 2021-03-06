
/* http://stackoverflow.com/questions/5736398/how-to-calculate-the-svg-path-for-an-arc-of-a-circle */

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  var angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;

  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x, y, r1, r2, startAngle, endAngle){

    var p1 = polarToCartesian(x, y, r1, endAngle);
    var p2 = polarToCartesian(x, y, r1, startAngle);
    var p3 = polarToCartesian(x, y, r2, startAngle);
    var p4 = polarToCartesian(x, y, r2, endAngle);

    var arcSweep1 = endAngle - startAngle <= 180 ? "0" : "1";

    var d = [
        "M", p1.x, p1.y, 
        "A", r1, r1, 0, arcSweep1, 0, p2.x, p2.y,
        "L", p3.x, p3.y,
        "A", r2, r2, 0, arcSweep1, 1, p4.x, p4.y,
        "z"
    ];

    return d.join(" ");
}

var get_angle = function( when ) {
    return ( when.getHours()*60 + when.getMinutes() ) / 4;
};

/* planets: 0 Saturn, 1 Jupiter, 2 Mars, 3 Sun, 4 Venus, 5 Mercury, 6 Moon */
var planet_colours = ['#00f', '#0d0', '#f00', '#ff0', '#0dd', '#f80', '#eee'];
var planet_names = ['\u2644', '\u2643', '\u2642', '\u2609', '\u2640', '\u263F', '\u263E'];

var planet_number = [6,2,5,1,4,0,3];

var get_date_string = function( when ) {
    return when.getFullYear()+'-'+('00'+(when.getMonth()+1)).substr(-2)+'-'+('00'+when.getDate()).substr(-2);
};

var get_time_string = function( minutes ) {
    hours = Math.floor(minutes / 60) % 24;
    minutes = Math.floor(minutes % 60);

    return ('00'+hours).substr(-2)+':'+('00'+minutes).substr(-2)
};

var visualize = function( start_planet, sunrise, sunset, next_sunrise, tz ) {
    console.log('tz '+tz+' sunrise '+sunrise);
    var g = document.getElementById("hours");
    g.innerHTML= '<circle cx="1" cy="1" r="0.5" stroke="none" fill="yellow" />';

    var sunrise_angle = get_angle(sunrise);
    var sunset_angle = get_angle(sunset);
    var next_sunrise_angle = get_angle(next_sunrise) + 360;

    while (sunset_angle < sunrise_angle) {
        sunset_angle += 360;
    }

    while (next_sunrise_angle < sunset_angle) {
        sunset_angle += 360;
    }

    console.log(sunrise_angle, sunset_angle, next_sunrise_angle);

    var night_sweep = (next_sunrise_angle + 360 - sunset_angle) / 12;

    var angles = [];

    var day_sweep = (sunset_angle - sunrise_angle) / 12;
    for (var i=0; i<12; i++) {
        angles.push( sunrise_angle + day_sweep*i );
    }

    var night_sweep = (sunrise_angle + 360 - sunset_angle) / 12;
    for (var i=0; i<13; i++) {
        angles.push( sunset_angle + night_sweep*i );
    }


    var inner_html = '';
    for (var i=1; i<angles.length; i++) {
        var planet = (start_planet + i) % 7;
        var arc_colour = planet_colours[planet];
        if (i>12) {
            var arc_opacity = 0.5;
        } else {
            var arc_opacity = 1;
        }
        if (i>1) {
            var arc_r2 = 0.6 + 0.2 * (i / angles.length);
            var arc_r1 = 0.9;
        } else {
            var arc_r2 = 0.6;
            var arc_r1 = 0.95;
        }
        var arc_path = describeArc(1,1,arc_r1,arc_r2,angles[i-1],angles[i]-1);
        inner_html += '<path opacity="'+arc_opacity+'" stroke="none" fill="'+arc_colour+'" d="'+arc_path+'" data-planet="'+planet_names[planet]+'" data-start-time="'+angles[i-1]*4+'" data-end-time="'+angles[i]*4+'"/>';
    }

    var arc_path = describeArc(1,1,0.92,0.96,angles[0],angles[12]-1);
    inner_html += '<path stroke="none" fill="'+planet_colours[(start_planet+1)%7]+'" d="'+arc_path+'" />';
    
    g.innerHTML = inner_html;

    var n = g.firstChild;
    while (true) {
        if (n.getAttribute('data-planet')) {
            n.onmouseover = function() {
                document.getElementById('text-planet').firstChild.nodeValue = this.getAttribute('data-planet');
                var st = get_time_string(this.getAttribute('data-start-time'));
                var et = get_time_string(this.getAttribute('data-end-time'));
                document.getElementById('text-time').firstChild.nodeValue = st+' \u2192 '+et;
            };
        }
        n = n.nextSibling;
        if (!n) {
            break;
        }
    }
    g.firstChild.onmouseover();
};

var refresh = function() {
    console.log("refresh "+document.location.hash);
    var lat_match = /lat=([-0-9.]+)/.exec(document.location.hash);
    if (lat_match) {
        var lat = lat_match[1];
    } else {
        var lat = 51.5199;
    }
    document.getElementById('lat').value = lat;

    var lon_match = /lon=([-0-9.]+)/.exec(document.location.hash);
    if (lon_match) {
        var lon = lon_match[1];
    } else {
        var lon = -0.1312
    }
    document.getElementById('lon').value = lon;

    var when_match = /when=([^&]+)/.exec(document.location.hash);
    if (when_match) {
        var when = new Date(when_match[1]);
        if (when && !isNaN(when.getTime())) {
            console.log("Using when "+when);
        } else {
            var when = new Date();
        }
    } else {
        var when = new Date();
    }
    document.getElementById('when').value = get_date_string(when);

    var times = SunCalc.getTimes( when, lat, lon );
    console.log(times.sunrise)
    when.setDate( when.getDate() + 1 );
    var tomorrow_times = SunCalc.getTimes( when, lat, lon );

    visualize( planet_number[when.getDay()], times.sunrise, times.sunset, tomorrow_times.sunrise, when.getTimezoneOffset() );
};

var go_days = function(days) {
    when = new Date(document.getElementById('when').value);
    if (when) {
        when.setDate( when.getDate() + days );
        document.getElementById('when').value = get_date_string(when);
        go();
    }
}

var go = function() {
    document.location.hash = 'lat='+document.getElementById('lat').value+'&lon='+document.getElementById('lon').value+'&when='+document.getElementById('when').value;
};

var init = function() {
    window.onhashchange = refresh;
    if (document.location.hash) {
        refresh();
    } else {
        go();
    }
};
