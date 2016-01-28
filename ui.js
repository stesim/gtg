var UI =
{

create: function( tag )
{
	return document.createElement( tag );
},

text: function( content )
{
	return document.createTextNode( content );
},

linebreak: function()
{
	return document.createElement( "br" );
},

get: function( id )
{
	return document.getElementById( id );
},

show: function( elem )
{
	//elem.style.display = "initial";
	elem.style.display = null;
},

hide: function( elem )
{
	elem.style.display = "none";
},

setVisibility: function( elem, visible )
{
	if( visible )
	{
		UI.show( elem );
	}
	else
	{
		UI.hide( elem );
	}
},

enable: function( elem )
{
	elem.disabled = false;
},

disable: function( elem )
{
	elem.disabled = true;
},

setText: function( elem, content )
{
	elem.textContent = content;
},

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
	this._text = text;
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
	this._text = text;
	this._onclick = onclick;
	this.group = null;

	this.elem = document.createElement( "button" );
	this.elem.innerHTML = text;
	this.elem.onclick = function() { audio.playButtonClick(); onclick(); };
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

function _UI_PosString( pos, relative )
{
	return ( relative ? ( pos * 100 ) + "%" : pos + "px" );
}

UI.Control.prototype.position = function( pos, relative )
{
	if( pos.top !== undefined )
	{
		this.elem.style.top = _UI_PosString( pos.top, relative );
	}
	else if( pos.bottom !== undefined )
	{
		this.elem.style.bottom = _UI_PosString( pos.bottom, relative );
	}
	if( pos.left !== undefined )
	{
		this.elem.style.left = _UI_PosString( pos.left, relative );
	}
	else if( pos.right !== undefined )
	{
		this.elem.style.right = _UI_PosString( pos.right, relative );
	}
	return this;
}

UI.Control.prototype.size = function( width, height, relative )
{
	this.elem.style.width = _UI_PosString( width, relative );
	this.elem.style.height = _UI_PosString( height, relative );
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

UI.Button.prototype.onclick = function( onclick )
{
	this._onclick = onclick;
	this.elem.onclick = onclick;
	return this;
}

UI.Group.prototype.add = function( control )
{
	function addControl( grp, ctl )
	{
		if( ctl.group !== null )
		{
			ctl.group.remove( ctl );
		}

		ctl.group = grp;
		grp.controls.push( ctl );

		grp.elem.appendChild( ctl.elem );
	}

	if( control )
	{
		if( Array.isArray( control ) )
		{
			for( var i = 0; i < control.length; ++i )
			{
				addControl( this, control[ i ] );
			}
		}
		else
		{
			addControl( this, control );
		}
	}
	return this;
}

UI.Group.prototype.remove = function( control )
{
	this.controls.splice( this.controls.indexOf( control ), 1 );
	this.elem.removeChild( control.elem );

	control.group = null;
}
