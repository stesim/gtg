var Cookie =
{
	_content: {},

	init: function()
	{
		this._read();
	},

	get: function( key )
	{
		return this._content[ key ];
	},

	getInt: function( key )
	{
		return parseInt( this._content[ key ] );
	},

	set: function( key, value )
	{
		if( !key ) { return; } 

		this._content[ key ] = value;

		var date = new Date();
		date.setTime( date.getTime() + ( 365 * 24 * 60 * 60 * 1000 ) );

		document.cookie = key + "=" + value + "; expires=" + date.toUTCString();
	},

	_read: function()
	{
		var keyvals = document.cookie.split( ";" );
		for( var i = 0; i < keyvals.length; ++i )
		{
			var pair = keyvals[ i ];
			var sepIndex = pair.indexOf( "=" );

			var key = pair.substr( 0, sepIndex ).trim();
			if( key !== "" )
			{
				var values = pair.substr( sepIndex + 1 ).trim().split( "," );

				this._content[ key ] =
					( values.length > 1 ? values : values[ 0 ] );
			}
		}
	},

	_write: function( content )
	{
		var date = new Date();
		date.setTime( date.getTime() + ( 365 * 24 * 60 * 60 * 1000 ) );

		var expires = "expires=" + toUTCString();

		for( var key in content )
		{
			if( key !== "" )
			{
				document.cookie = key + "=" + content[ key ] + "; " + expires;
			}
		}
	},
}
