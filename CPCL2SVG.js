CPCL2SVG = {

	state: {},
	elements: [],
	svgNS: null,

	/**
	 * Renders an SVG from CPCL data
	 */
	render: function render(data) {

		var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		CPCL2SVG.svgNS = svg.namespaceURI;

		CPCL2SVG.rx = Math.random();
		CPCL2SVG.ry = Math.random();

		// Reset everything before trying to render the data.
		CPCL2SVG.reset();

		// split CPCL instructions into individual line instructions
		var instructions = data.split("\n");

		// Iterate over each instruction
		for(var i=0; i<instructions.length; i++) {

			instructionComponents = instructions[i].split(" ");
			var instructionPrefix = instructionComponents[0];
			var instructionPayload = instructions[i].slice(instructionPrefix.length+1);
			var command = CPCL2SVG.getCommand(instructionPrefix);

			if(command){

				command(instructionPayload);

			} else if(CPCL2SVG.state["barcode"]){
				CPCL2SVG.state["barcodeData"] += "\n"+instructions[i];
			} else {

				// Could be in line print mode and could possibly contain a utility function within 
				// this function. But by default, we are printing pure text. So what we are
				// essentially building is a group of tspan block.

				// First check for any utility functions embedded in this message
				var linePrintModeInstruction = instructions[i];
				var linePrintModeFlush = true;
				var utilityInstructionIndex = linePrintModeInstruction.indexOf("! U1 ");
				var utilityInstructionPayload = null;
				var utilityInstructionCommand = null;
				if(utilityInstructionIndex != -1)
				{
					var utilityInstruction = linePrintModeInstruction.slice(utilityInstructionIndex+5);
					var utilityInstructionComponents = utilityInstruction.split(" ");
					var utilityInstructionPrefix = utilityInstructionComponents[0];
					var utilityInstructionPayload = utilityInstruction.slice(utilityInstructionPrefix.length+1);
					var utilityInstructionCommand = CPCL2SVG.getUtilitiesCommand(utilityInstructionPrefix);
					if(utilityInstructionCommand)
					{
						linePrintModeInstruction = linePrintModeInstruction.slice(0,utilityInstructionIndex);
						linePrintModeFlush = false;
					}
				}

				// Create necessary text nodes
				var textNode = document.createTextNode(linePrintModeInstruction.replace(/\s/g, '\u00A0')+"\n");
				var tspan = document.createElementNS(CPCL2SVG.svgNS,'tspan');
				var text = document.createElementNS(CPCL2SVG.svgNS,'text');

				tspan.setAttribute('alignment-baseline',"hanging");

				switch(CPCL2SVG.state["linePrinter"]["font"]){
			    	case "0":
			    	case "2":
			    	case "6":
			    		tspan.setAttribute('font-family',"monospace");
			    		break;
			    	case "1":
			    		tspan.setAttribute('font-style',"italic");
			    		break;
			    	case "2":
			    	case "4":
			    		tspan.setAttribute('font-family',"Arial");
			    		break;
			    	case "7":
			    		tspan.setAttribute('font-family',"Andale Mono");
			    		break;
			    }

			    // Apply size
			    var xScale = 1;
			    var yScale = 1;

			    switch(CPCL2SVG.state["linePrinter"]["font"]){
			    	case "0":
			    		switch(CPCL2SVG.state["linePrinter"]["size"])
			    		{
			    			case "0":
			    			case "1":
			    			case "2":
					    		tspan.setAttribute('font-size',"9px");
					    		break;
					    	case "3":
					    	case "4":
					    	case "5":
					    		tspan.setAttribute('font-size',"18px");
					    		break;
					    	case "6":
					    		tspan.setAttribute('font-size',"36px");
					    		break;
			    		}
			    		switch(CPCL2SVG.state["linePrinter"]["size"]){
					    	case "0":
					    	case "3":
					    	case "6":
					    		break;
					    	case "1":
					    	case "4":
					    		xScale = 2;
					    		break;
					    	case "2":
					    	case "5":
					    		yScale = 2;
					    		break;
				    	}
			    		break;
		    		case "4":
			    		switch(CPCL2SVG.state["linePrinter"]["size"]){
			    			case "0":
					    		xScale=2;
					    		yScale=2;
					    		break;
					    	case "1":
					    		yScale=4;
					    		break;
				    	}
			    		break;
			    	case "7":
			    		switch(CPCL2SVG.state["linePrinter"]["size"]){
			    			case "0":
					    		xScale=0.9;
					    		yScale=0.9;
					    		break;
					    	case "1":
					    		yScale=2;
					    		break;
				    	}
			    		break;
			    }

			    transform = "matrix("+xScale+" 0 0 "+yScale+" "+(CPCL2SVG.state["linePrinter"]["x"]+CPCL2SVG.state["linePrinter"]["lmargin"])+" "+CPCL2SVG.state["linePrinter"]["y"]+")";
			    text.setAttribute('transform',transform);

				tspan.appendChild(textNode);
				text.appendChild(tspan);
				text = svg.appendChild(text);

				if(utilityInstructionCommand){
					utilityInstructionCommand(utilityInstructionPayload);					
				}

				if(linePrintModeFlush)
				{
					CPCL2SVG.state["linePrinter"]["x"] = 0;
					CPCL2SVG.state["linePrinter"]["y"] += parseInt(CPCL2SVG.state["linePrinter"]["unitHeight"]);
				}
				else
				{
					// Unfortunately, in order to get the length of the generated text, we would need to
					// render the svg first, then get the width of the element before continuing. This
					// can be done with requestAnimationFrame and callbacks for this class, but since
					// we ideally want everything to be rendered immedietly, this hasn't been implemented.
					// To remedy this, one CAN predictably adjust the X cursor using either X or RX or RXY
					// but it is a hacky work around.
					// CPCL2SVG.state["linePrinter"]["x"] += text.getBoundingClientRect().width;
				}

			}

			document.body.appendChild(
				document.createElement("a").appendChild(
					document.createTextNode(instructions[i].replace(/\s/g, '\u0020'))
					)
				);
			document.body.appendChild(document.createElement("br"));
		}

	    for(var i in CPCL2SVG.elements){
	    	svg.appendChild(CPCL2SVG.elements[i]);
	    }

	    if(this.state["!"]["Height"]!=null)
	    {
	    	svg.setAttribute("height",this.state["!"]["Height"]+"px");
	    }
	    else if(CPCL2SVG.state["linePrinter"]["y"]!=0){
	    	svg.setAttribute("height",CPCL2SVG.state["linePrinter"]["y"]+"px");
	    } else {
	    	// Todo: Get bounding boxes of all elements in svg that will set an attribute
	    	svg.setAttribute("height","200px");
	    }
	    if(CPCL2SVG.state["pageWidth"]!= null)
	    {
	    	svg.setAttribute("width",this.state["pageWidth"]+"px");
	    }
	    svg.setAttribute("style","border:2px solid #CCC;border-bottom: 2px dashed #CCC;border-top: 2px dashed #CCC;");
	    return svg;

	},

	reset: function reset() {
		CPCL2SVG.state = {
			"!": {
				"HorizontalOffset": null,
				"HorizontalResolution": 200,
				"VerticalResolution": 200,
				"Height": null,
				"Quantity": null
			},
			"barcode": false,
			"units": "dots",
			"contrast": "0",
			"tone": "0",
			"pageWidth": 2000,
			"speed": 3,
			"linePrinter":{
				"font": 0,
				"size": 0,
				"unitHeight": 0,
				"lmargin": 0,
				"y": 0,
				"x": 0
			}
		};
		CPCL2SVG.elements = [];
	},

	getCommand: function getCommand(cmd){
		if(CPCL2SVG.commands[cmd] == undefined){
			return undefined;
		}
		var unavailableCommands = [
			"X",
			"Y",
			"XY",
			"RX",
			"RY",
			"RXY",
			"SETLP",
			"SETLF",
			"SETSP",
			"SETBOLD",
			"LMARGIN",
			"PAGE-HEIGHT",
			"PH",
		];
		if(unavailableCommands.indexOf(cmd)!=-1){
			return undefined;
		}
		return CPCL2SVG.commands[cmd];
	},

	getUtilitiesCommand: function getUtilitiesCommand(cmd){
		if(CPCL2SVG.commands[cmd] == undefined){
			return undefined;
		}
		return CPCL2SVG.commands[cmd];
	},

	argsToArray: function argsToArray(args) {
	    return Array.prototype.slice.call(args);
	},

	commands: {
		";": function semiColonSymbol(){
			
		},
		"!": function exclamationSymbol(params){

			var parameters = params.split(" ");

			if(!isNaN(parseFloat(parameters[0]))) {

				// Label File
				CPCL2SVG.state["!"]["HorizontalOffset"] = parameters[0];
				CPCL2SVG.state["!"]["HorizontalResolution"] = parameters[1];
				CPCL2SVG.state["!"]["VerticalResolution"] = parameters[2];
				CPCL2SVG.state["!"]["Height"] = parameters[3];
				CPCL2SVG.state["!"]["Quantity"] = parameters[4];

			} else if(parameters[0] == "UTILITIES") {

				// utilities command session

			} else if(parameters[0] == "U1") {

				// utilities command session
				CPCL2SVG.tools.singleUtilityInstruction(params.slice(3));

			}
		},
		PRINT: function print(){
			// CPCL2SVG.reset();
		},
		END: function end(){
			CPCL2SVG.reset();
		},
		ABORT: function abort(){
			CPCL2SVG.reset();
		},
		ENCODING: function encoding(){
			
		},
		FORM: function form(){
			
		},
		JOURNAL: function journal(){
			
		},
		"IN-INCHES": function inInches(){
			CPCL2SVG.state["units"] = "inches";
		},
		"IN-CENTIMETERS": function inCentimeters(){
			CPCL2SVG.state["units"] = "centimeters";
		},
		"IN-MILLIMETERS": function inMillimeters(){
			CPCL2SVG.state["units"] = "millimeters";
		},
		"IN-DOTS": function inDots(){
			CPCL2SVG.state["units"] = "dots";
		},
		T: function t(){
			CPCL2SVG.getCommand("TEXT").apply(this,arguments);
		},
		VT: function vt(){
			CPCL2SVG.getCommand("TEXT90").apply(this,arguments);
		},
		VTEXT: function vtext(){
			CPCL2SVG.getCommand("TEXT90").apply(this,arguments);
		},
		T90: function t90(){
			CPCL2SVG.getCommand("TEXT90").apply(this,arguments);
		},
		T180: function t180(){
			CPCL2SVG.getCommand("TEXT180").apply(this,arguments);
		},
		T270: function t270(){
			CPCL2SVG.getCommand("TEXT270").apply(this,arguments);
		},
		TEXT: function text(params){
			CPCL2SVG.tools.genericText(0,params);
		},
		TEXT90: function text90(params){
			CPCL2SVG.tools.genericText(90,params);
		},
		TEXT180: function text180(params){
			CPCL2SVG.tools.genericText(180,params);
		},
		TEXT270: function text270(params){
			CPCL2SVG.tools.genericText(270,params);
		},
		L: function l(){
			CPCL2SVG.getCommand("LINE").apply(this,arguments);
		},
		/**
		 * @param x0 X-coordinate of the top left corner.
		 * @param y0 Y-coordinate of the top left corner.
		 * @param x1 X-coordinate of:
		 *  - top right corner for horizontal.
		 *  - bottom left corner for vertical.
		 * @param y1 Y-coordinate of the bottom right corner.
		 *  - top right corner for horizontal.
		 *  - bottom left corner for vertical.
		 * @param width Unit-width (or thickness) of the lines forming the box.
		 */
		LINE: function line(params){

			var parameters = params.split(" ");

			var x0 = parameters[0];
			var y0 = parameters[1];
			var x1 = parameters[2];
			var y1 = parameters[3];
			var width = parameters[4];

			var line = document.createElementNS(CPCL2SVG.svgNS,'line');
		    line.setAttribute('x1',x0);
		    line.setAttribute('y1',y0);
		    line.setAttribute('x2',x1);
		    line.setAttribute('y2',y1);
		    line.setAttribute('stroke','#000000');
		    line.setAttribute('stroke-width',width);

		    CPCL2SVG.elements.push(line);
		},
		IL: function l(){
			CPCL2SVG.getCommand("INVERSE-LINE").apply(this,arguments);
		},
		/**
		 * @param x0 X-coordinate of the top left corner.
		 * @param y0 Y-coordinate of the top left corner.
		 * @param x1 X-coordinate of:
		 *  - top right corner for horizontal.
		 *  - bottom left corner for vertical.
		 * @param y1 Y-coordinate of the bottom right corner.
		 *  - top right corner for horizontal.
		 *  - bottom left corner for vertical.
		 * @param width Unit-width (or thickness) of the lines forming the box.
		 */
		"INVERSE-LINE": function inverseLine(x0,y0,x1,y1,width){
			// Could be implemnted using background-filter, but this would only be supported on safari for max os x
		},
		/**
		 * @param x0 X-coordinate of the top left corner.
		 * @param y0 Y-coordinate of the top left corner.
		 * @param x1 X-coordinate of the bottom right corner.
		 * @param y1 Y-coordinate of the bottom right corner.
		 * @param width Unit-width (or thickness) of the lines forming the box.
		 */
		BOX: function box(params){

			var parameters = params.split(" ");

			var x0 = parameters[0];
			var y1 = parameters[1];
			var x0 = parameters[2];
			var y1 = parameters[3];
			var width = parameters[4];

			var rect = document.createElementNS(CPCL2SVG.svgNS,'rect');
		    rect.setAttribute('x',x0);
		    rect.setAttribute('y',y0);
		    rect.setAttribute('width',x1-x0);
		    rect.setAttribute('height',y1-y0);
		    rect.setAttribute('stroke','#000000');
		    rect.setAttribute('stroke-width',width);
		    rect.setAttribute('fill','none');

		    CPCL2SVG.elements.push(rect);
		},
		B: function b(){
			CPCL2SVG.getCommand("BARCODE").apply(this,arguments);
		},
		BARCODE: function barcode(args){
			CPCL2SVG.tools.genericBarcode(0,args);
		},
		VB: function vb(){
			CPCL2SVG.getCommand("VBARCODE").apply(this,arguments);
		},
		VBARCODE: function vbarcode(args){
			CPCL2SVG.tools.genericBarcode(90,args);
		},
		ENDPDF: function endPDF(){
			CPCL2SVG.tools.printBarcode();
			CPCL2SVG.state["barcode"] = false;
			CPCL2SVG.state["barcodeMode"] = false;
			CPCL2SVG.state["barcodeData"] = false;
		},
		/**
		 * @param contrast Contrast Level (0 = Default, 1 = Medium, 2 = Dark, 3 = Very Dark)
		 */
		CONTRAST: function contrast(contrast){
			CPCL2SVG.state["contrast"] = contrast;
		},
		/**
		 * @param tone Contrast Level (0 = Default, 1 = Medium, 2 = Dark, 3 = Very Dark)
		 */
		TONE: function tone(tone){
			CPCL2SVG.state["tone"] = tone;
		},
		/**
		 * @param speed A number between 0 and 5, 0 being the slowest speed.
		 */
		SPEED: function speed(speedLevel){
			CPCL2SVG.state["speed"] = speed;
		},
		"BAR-SENSE": function barSense(){
		},
		PW: function pw(){
			CPCL2SVG.getCommand("PAGE-WIDTH").apply(this,arguments);
		},
		"PAGE-WIDTH": function pageWidth(width){
			CPCL2SVG.state["pageWidth"] = width;
		},
		PH: function ph(){
			CPCL2SVG.getCommand("PAGE-WIDTH").apply(this,arguments);
		},
		"PAGE-HEIGHT": function pageHeight(width){
			CPCL2SVG.state["!"]["Height"] = width;
		},
		LEFT: function left(end){
		},
		CENTER: function center(end){
		},
		RIGHT: function right(end){
		},

		SETLP: function setLinePrinterFont(params)
		{
			var parameters = params.split(" ");

			CPCL2SVG.state["linePrinter"]["font"] = parameters[0];
			CPCL2SVG.state["linePrinter"]["size"] = parameters[1];
			CPCL2SVG.state["linePrinter"]["unitHeight"] = parseFloat(parameters[2]);
		},
		SETLF: function setLineUnitHeight(params)
		{
			var parameters = params.split(" ");
			CPCL2SVG.state["linePrinter"]["unitHeight"] = parseFloat(parameters[0]);
		},
		X: function setLinePrinterX(params)
		{
			var parameters = params.split(" ");
			CPCL2SVG.state["linePrinter"]["x"] = parseFloat(parameters[0]);
		},
		Y: function setLinePrinterY(params)
		{
			var parameters = params.split(" ");
			CPCL2SVG.state["linePrinter"]["y"] = parseFloat(parameters[0]);
		},
		XY: function setLinePrinterXY(params)
		{
			var parameters = params.split(" ");
			CPCL2SVG.state["linePrinter"]["x"] = parseFloat(parameters[0]);
			CPCL2SVG.state["linePrinter"]["y"] = parseFloat(parameters[1]);
		},
		RX: function setLinePrinterRX(params)
		{
			var parameters = params.split(" ");
			CPCL2SVG.state["linePrinter"]["x"] += parseFloat(parameters[0]);
		},
		RY: function setLinePrinterRY(params)
		{
			var parameters = params.split(" ");
			CPCL2SVG.state["linePrinter"]["y"] += parseFloat(parameters[0]);
		},
		RXY: function setLinePrinterRXY(params)
		{
			var parameters = params.split(" ");
			CPCL2SVG.state["linePrinter"]["x"] += parseFloat(parameters[0]);
			CPCL2SVG.state["linePrinter"]["y"] += parseFloat(parameters[1]);
		},
		LMARGIN: function setLinePrinterLeftMargin(params)
		{
			var parameters = params.split(" ");
			CPCL2SVG.state["linePrinter"]["lmargin"] = parseFloat(parameters[0]);
		}

	},

	tools: {
		/**
		 * @param orientation The rotation in degrees around the coordinate (x,y)
		 * @param font Name/number of the font.
		 * @param size Size identifier for the font.
		 * @param x Horizontal starting position.
		 * @param y Vertical starting position.
		 * @param ... The text to be printed (each subsequent argument is printed with a space in between)
		 */
		genericText: function genericText(orientation,params){

			var parameters = params.split(" ");

			var font = parameters[0];
			var size = parameters[1];
			var x = parameters[2];
			var y = parameters[3];

			var data = params.slice( font.length +
				size.length +
				x.length +
				y.length +
				4 ).replace(/\s/g, '\u00A0');

			// Create necessary text nodes
			var textNode = document.createTextNode(data);

			var tspan = document.createElementNS(CPCL2SVG.svgNS,'tspan');
			tspan.setAttribute('alignment-baseline',"hanging");

			var text = document.createElementNS(CPCL2SVG.svgNS,'text');

			// Apply translation
		    // text.setAttribute('x',x);
		    // text.setAttribute('y',y);

		    // Apply orientation changes
		    transform = "rotate("+orientation+" "+x+","+y+") ";

		    // Apply font
		    switch(font){
		    	case "0":
		    	case "2":
		    	case "6":
		    		text.setAttribute('font-family',"monospace");
		    		break;
		    	case "1":
		    		text.setAttribute('font-style',"italic");
		    		break;
		    	case "2":
		    		text.setAttribute('font-family',"Arial");
		    		break;
		    	case "7":
		    		text.setAttribute('font-family',"Andale Mono");
		    		break;
		    }

		    // Apply size
		    var xScale = 1;
		    var yScale = 1;

		    switch(font){
		    	case "0":
		    		text.setAttribute('font-size',"7pt");
		    		switch(size){
				    	case "0":
				    		
				    		break;
				    	case "1":
				    		xScale = 2;
				    		break;
				    	case "2":
				    		yScale = 2;
				    		break;
				    	case "3":
				    		xScale = 2;
				    		yScale = 2;
				    		break;
				    	case "4":
				    		xScale = 4;
				    		yScale = 2;
				    		break;
				    	case "5":
				    		xScale = 2;
				    		yScale = 4;
				    		break;
				    	case "6":
				    		xScale = 4;
				    		yScale = 4;
				    		break;
			    	}
		    		break;
		    	case "7":
		    		switch(size){
				    	case "1":
				    		yScale=2;
				    		break;
			    	}
		    		break;
		    }

		    transform += "matrix("+xScale+" 0 0 "+yScale+" "+x+" "+y+")";

		    text.setAttribute('transform',transform);

		    tspan.appendChild(textNode);
		    text.appendChild(tspan);

		    CPCL2SVG.elements.push(text);
		},
		genericBarcode: function genericBarcode(orientation, params){

			// hardcoded for now to only support PDF415 and all the arguments must be passed in.

			var parameters = params.split(" ");
			var type = parameters[0];
			var x = parameters[1];
			var y = parameters[2];
			var xd = parameters[4];
			var yd = parameters[6];
			var c = parameters[8];
			var s = parameters[10];

			CPCL2SVG.state["barcode"] = true;
			CPCL2SVG.state["barcodeMode"] = {};
			CPCL2SVG.state["barcodeMode"]["orientation"] = orientation;
			CPCL2SVG.state["barcodeMode"]["type"] = type;
			CPCL2SVG.state["barcodeMode"]["x"] = parseFloat(x);
			CPCL2SVG.state["barcodeMode"]["y"] = parseFloat(y);
			CPCL2SVG.state["barcodeMode"]["xd"] = parseFloat(xd);
			CPCL2SVG.state["barcodeMode"]["yd"] = parseFloat(yd);
			CPCL2SVG.state["barcodeMode"]["c"] = parseInt(c);
			CPCL2SVG.state["barcodeMode"]["s"] = parseInt(s);
			CPCL2SVG.state["barcodeData"] = "";

			/*{command} {type} {x} {y} [XD n] [YD n] [C n] [S n] {data}
<ENDPDF>
where:
{command}: Choose from the following:
BARCODE (or B): Prints bar code horizontally.
VBARCODE (or VB): Prints bar code vertically. {type}: PDF-417
{x}: Horizontal starting position.
{y}: Vertical starting position.
[XD n]: Unit-width of the narrowest element. Range is 1 to 32, default is 2.
[YD n]: Unit-height of the narrowest element. Range is 1 to 32, default is 6.
[C n]: Number of columns to use. Data columns do not include start/stop characters and left/right indicators. Range is 1 to 30; default is 3.
[S n]: Security level indicates maximum amount of errors to be detected and/or corrected. Range is 0 to 8; default is 1.
{data} Bar code data.
<ENDPDF>: Terminates PDF-417.*/
		},
		printBarcode: function printBarcode(){

			if(CPCL2SVG.state["barcodeMode"]["type"] == "PDF-417"){

	            PDF417.init(CPCL2SVG.state["barcodeData"],CPCL2SVG.state["barcodeMode"]["s"],CPCL2SVG.state["barcodeMode"]["c"]/2*0 + 2);             
	            var barcode = PDF417.getBarcodeArray();
	            // block sizes (width and height) in pixels
            	var bw = CPCL2SVG.state["barcodeMode"]["xd"];
            	var bh = CPCL2SVG.state["barcodeMode"]["yd"];
	            // create canvas element based on number of columns and rows in barcode
	            
	            // graph barcode elements
	            var x,y;
	            if(CPCL2SVG.state["barcodeMode"]["orientation"] == 0)
                {
                	y = CPCL2SVG.state["barcodeMode"]["y"];
                }
                else if(CPCL2SVG.state["barcodeMode"]["orientation"] == 90)
                {
                	x = CPCL2SVG.state["barcodeMode"]["x"];
                }
	            // for each row
	            for (var r = 0; r < barcode['num_rows']; r+=4) {
	                if(CPCL2SVG.state["barcodeMode"]["orientation"] == 0)
	                {
	                	x = CPCL2SVG.state["barcodeMode"]["x"];
	                }
	                else if(CPCL2SVG.state["barcodeMode"]["orientation"] == 90)
	                {
	                	y = CPCL2SVG.state["barcodeMode"]["y"];
	                }
	                // for each column
	                for (var c = 0; c < barcode['num_cols']; c++) {
	                    if (barcode['bcode'][r][c] == 1) {
	                    	var rect = document.createElementNS(CPCL2SVG.svgNS,'rect');
						    rect.setAttribute('x',x);
						    rect.setAttribute('y',y);
						    rect.setAttribute('width',bw);
						    rect.setAttribute('height',bh);
						    rect.setAttribute('fill','#000000');

						    CPCL2SVG.elements.push(rect);
	                    }
	                    if(CPCL2SVG.state["barcodeMode"]["orientation"] == 0)
	                    {
	                    	x += bw;
	                    }
	                    else if(CPCL2SVG.state["barcodeMode"]["orientation"] == 90)
	                    {
	                    	y += bh;
	                    }
	                }
	                if(CPCL2SVG.state["barcodeMode"]["orientation"] == 0)
                    {
                    	y += bh;
                    }
                    else if(CPCL2SVG.state["barcodeMode"]["orientation"] == 90)
                    {
                    	x += bw;
                    }
	            }
			}
		},
		singleUtilityInstruction: function singleUtilityInstruction(instruction){
			instructionComponents = instruction.split(" ");
			var instructionPrefix = instructionComponents[0];
			var instructionPayload = instruction.slice(instructionPrefix.length+1);
			var command = CPCL2SVG.getUtilitiesCommand(instructionPrefix);

			if(command){
				command(instructionPayload);
			}
		}
	}

};