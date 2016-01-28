var audio =
{
	ambient: null,
	effect: null,

	ambientTracks:
	[
		"Free Ambient Loop.mp3",
		"Ambient Loop 1.mp3"
	],
	currentRandomAmbient: -1,

	init: function()
	{
		this.ambient = new Audio();
		this.ambient.volume = 0.1;
		this.ambient.autoplay = true;
		this.ambient.onended = ( function()
		{
			if( this.currentRandomAmbient >= 0 )
			{
				this.playRandomAmbient();
			}
		} ).bind( this );

		this.effect = new Audio();
		this.effect.volume = 0.2;
		this.effect.src = "audio/157539__nenadsimic__click.wav";
		this.effect.load();
	},

	playAmbient: function( source, loop )
	{
		this.currentRandomAmbient = -1;

		this.ambient.src = "audio/" + source;
		this.ambient.loop = loop;
		this.ambient.load();
	},

	playLoadingTrack: function()
	{
		audio.playAmbient( "Fahrstuhl 2a.mp3", true );
	},

	playRandomAmbient: function()
	{
		this.ambient.loop = false;

		if( this.currentRandomAmbient < 0 )
		{
			this.currentRandomAmbient =
				Math.floor( Math.random() * this.ambientTracks.length );
		}
		else
		{
			this.currentRandomAmbient =
				( Math.floor( Math.random() * ( this.ambientTracks.length - 1 ) ) +
				  this.currentRandomAmbient + 1 ) % this.ambientTracks.length;
		}

		this.ambient.src =
			"audio/" + this.ambientTracks[ this.currentRandomAmbient ];
		this.ambient.load();
	},

	playButtonClick: function()
	{
		this.effect.currentTime = 0;
		this.effect.play();
	},
};
