var UI =
{

Control: function()
{
},

Text: function( text, group )
{
	this._text = "";
	this.group = null;

	this.elem = document.createElement( "div" );
	this.elem.innerHTML = text;
	this.elem.style.position = "absolute";
	this.elem.style.display = "none";

	if( group )
	{
		group.add( this );
	}
},

Link: function( text, url, group )
{
	this._text = "";
	this._url = null;
	this.group = null;

	this.elem = document.createElement( "a" );
	this.elem.innerHTML = text;
	this.elem.href = url;
	this.elem.style.position = "absolute";
	this.elem.style.display = "none";

	if( group )
	{
		group.add( this );
	}
},

Button: function( text, onclick, group )
{
	this._text = "";
	this.onclick = onclick;
	this.group = null;

	this.elem = document.createElement( "button" );
	this.elem.innerHTML = text;
	this.elem.onclick = onclick;
	this.elem.style.position = "absolute";
	this.elem.style.display = "none";

	if( group )
	{
		group.add( this );
	}
},

FilePicker: function( accept, onchange, group )
{
	this.onchange = onchange;
	this.group = null;

	this.elem = document.createElement( "input" );
	this.elem.setAttribute( "type", "file" );
	this.elem.setAttribute( "accept", accept );
	this.elem.onchange = onchange;
	this.elem.style.position = "absolute";
	this.elem.style.display = "none";

	if( group )
	{
		group.add( this );
	}
},

Group: function( ctl, group )
{
	this.controls = new Array();
	this.group = null;

	this.elem = document.createElement( "div" );
	this.elem.style.position = "absolute";
	this.elem.style.display = "none";

	if( ctl )
	{
		this.add( ctl );
	}

	if( group )
	{
		group.add( this );
	}
},

};

UI.Control.prototype.position = function( pos )
{
	if( pos.top )
	{
		this.elem.style.top = pos.top + "px";
	}
	else if( pos.bottom )
	{
		this.elem.style.bottom = pos.bottom + "px";
	}
	if( pos.left )
	{
		this.elem.style.left = pos.left + "px";
	}
	else if( pos.right )
	{
		this.elem.style.right = pos.right + "px";
	}
	return this;
}

UI.Control.prototype.size = function( width, height )
{
	this.elem.style.width = width + "px";
	this.elem.style.height = height + "px";
	return this;
}

UI.Control.prototype.show = function()
{
	if( this.elem.parentNode === null )
	{
		document.body.appendChild( this.elem );
	}

	this.elem.style.display = "initial";
	return this;
}

UI.Control.prototype.hide = function()
{
	this.elem.style.display = "none";
	return this;
}

UI.Control.prototype.visible = function( val )
{
	if( val )
	{
		this.show();
	}
	else
	{
		this.hide();
	}
}

UI.Control.prototype.disable = function()
{
	this.elem.disabled = true;
	return this;
}

UI.Control.prototype.enable = function()
{
	this.elem.disabled = false;
	return this;
}

UI.Control.prototype.cssClass = function( c )
{
	this.elem.className = c;
	return this;
}

UI.Text.prototype = new UI.Control();
UI.Text.prototype.constructor = UI.Text;

UI.Link.prototype = new UI.Control();
UI.Link.prototype.constructor = UI.Link;

UI.Button.prototype = new UI.Control();
UI.Button.prototype.constructor = UI.Button;

UI.FilePicker.prototype = new UI.Control();
UI.FilePicker.prototype.constructor = UI.FilePicker;

UI.Group.prototype = new UI.Control();
UI.Group.prototype.constructor = UI.Group;

UI.Text.prototype.text = function( txt )
{
	this._text = txt;
	this.elem.innerHTML = txt;
	return this;
}

UI.Link.prototype.text = UI.Text.prototype.text;
UI.Link.prototype.url = function( url )
{
	this._url = url;
	this.elem.href = url;
	return this;
}

UI.Button.prototype.text = UI.Text.prototype.text;

UI.Group.prototype.add = function( control )
{
	function addControl( grp, ctl )
	{
		if( ctl.group !== null )
		{
			var idx = ctl.group.controls.indexOf( ctl );
			ctl.group.controls.splice( idx, 1 );
		}

		ctl.group = grp;
		grp.controls.push( ctl );

		grp.elem.appendChild( ctl.elem );
	}

	if( control )
	{
		if( Array.isArray( control ) )
		{
			for( ctl in control )
			{
				addControl( this, ctl );
			}
		}
		else
		{
			addControl( this, control );
		}
	}
	return this;
}

//UI.Group.prototype.position = function( pos )
//{
//	if( pos.top )
//	{
//		this.elem.style.top = pos.top + "px";
//	}
//	else if( pos.bottom )
//	{
//		this.elem.style.bottom = pos.bottom + "px";
//	}
//	if( pos.left )
//	{
//		this.elem.style.left = pos.left + "px";
//	}
//	else if( pos.right )
//	{
//		this.elem.style.right = pos.right + "px";
//	}
//	return this;
//}
//
//UI.Group.prototype.show = function()
//{
//	if( this.elem.parentNode === null )
//	{
//		document.body.appendChild( this.elem );
//	}
//
//	this.elem.style.visibility = "visible";
//	return this;
//}
//
//UI.Group.prototype.hide = function()
//{
//	this.elem.style.visibility = "hidden";
//	return this;
//}
