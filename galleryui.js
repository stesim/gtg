var ui =
{
	init: function()
	{
		ui.titleText = new UI.Text( "GUARD THE GALLERY" )
			.position( { top: 100, left: 100 } ).cssClass( "title" ).show();

		ui.mainMenu = new UI.Group()
			.position( { top: 200, left: 100 } )
			.size( 125, 200 )
			.cssClass( "verticalMenu" );
		
		ui.mainMenu.add( new UI.Button( "Story Mode",
			function()
			{
				ui.mainMenu.hide();
				ui.storyMenu.show();

				GameStates.Menu.lastVisible = ui.storyMenu;
			} ).position( { top: 0, left: 0 } ).show() );

		ui.mainMenu.add( new UI.Button( "Versus Mode",
			function()
			{
				ui.hint.display( "Versus Mode is not available yet.", 5 );
			} ).position( { top: 40, left: 0 } ).show().disable() );

		ui.mainMenu.show();
		
		ui.mainMenu.add( new UI.Button( "Level Creation",
			function()
			{
				GameState.set( GameStates.LevelEditing );
			} ).position( { top: 80, left: 0 } ).show() );

		ui.storyMenu = new UI.Group()
			.position( { top: 200, left: 100 } )
			.size( 125, 200 )
			.cssClass( "verticalMenu" );

		ui.storyMenu.add( new UI.Button( "Continue",
			function()
			{
				loadLevel( 0 );
			} ).position( { top: 0, left: 0 } ).show() );

		ui.storyMenu.add( new UI.Button( "Select Level",
			function()
			{
				ui.storyMenu.hide();
				ui.levelsMenu.show();

				GameStates.Menu.lastVisible = ui.levelsMenu;
			} ).position( { top: 40, left: 0 } ).show() );
		ui.storyMenu.add( new UI.Button( "BACK",
			function()
			{
				ui.storyMenu.hide();
				ui.mainMenu.show();

				GameStates.Menu.lastVisible = ui.mainMenu;
			} ).position( { top: 120, left: 0 } ).show() );

		ui.levelsMenu = new UI.Group()
			.position( { top: 200, left: 100 } )
			.size( 125, 200 )
			.cssClass( "verticalMenu" );

		var levelOnclick =
			function( i )
			{
				loadLevel( i );
			};
		for( var i = 0; i < levels.length; ++i )
		{
			ui.levelsMenu.add( new UI.Button( "Level " + ( i + 1 ),
				levelOnclick.bind( this, i ) )
					.position( { top: 40 * ( i % 4 ), left: 175 * Math.floor( i / 4 ) } ).show() );
		}
		ui.levelsMenu.add( new UI.Button( "BACK",
			function()
			{
				ui.levelsMenu.hide();
				ui.storyMenu.show();

				GameStates.Menu.lastVisible = ui.storyMenu;
			} ).position( { top: 5 * 40, left: 0 } ).show() );

		ui.ingameMenu = new UI.Group()
			.position( { top: 15, left: 15 } ).cssClass( "horizontalMenu" );

		ui.ingameMenu.quitButton = new UI.Button( "QUIT",
			function()
			{
				GameState.set( GameStates.Menu );
			}, ui.ingameMenu ).position( { top: 0, left: 0 } ).show();

		ui.ingameMenu.nextButton = new UI.Button( "Next",
			function()
			{
				loadLevel( levels.indexOf( currentLevel ) + 1 );
			}, ui.ingameMenu ).position( { top: 0, left: 135 } );

		ui.ingameMenu.overviewButton = new UI.Button( "Overview",
			function()
			{
				switchToOverview();
			}, ui.ingameMenu ).position( { top: 0, left: 135 } );

		ui.levelDetails = new UI.Group()
			.position( { top: 0, left: 0.25 }, true )
			.size( 0.5, 0, true ).cssClass( "details" );

		ui.levelDetails.title = new UI.Text( "", ui.levelDetails )
			.position( { top: 0, left: 0 } )
			.size( 1, 0, true )
			.cssClass( "title" ).show();

		ui.levelDetails.description =
			new UI.Text( "", ui.levelDetails )
			.position( { top: 50, left: 0 } )
			.size( 1, 0, true ).show();

		ui.guardDetails = new UI.Group()
			.position( { top: 0.25, right: 0.01 }, true )
			.size( 200, 0 );

		ui.guardDetails.budget = new UI.Text( "", ui.guardDetails )
			.position( { top: 0, right: 0 } )
			.size( 200, 50 )
			.cssClass( "centered title" ).show();

		ui.guardDetails.buttons = new UI.Group( null, ui.guardDetails )
			.position( { top: 50, right: 0 } )
			.size( 200, 0 )
			.cssClass( "verticalMenu" ).show();

		ui.completionText = new UI.Text( "LEVEL COMPLETED!" )
			.position( { top: 0.4, left: 0 }, true )
			.cssClass( "completion" );


		ui.hint = new UI.Text( "" )
			.position( { top: 15, right: 15 } ).cssClass( "hint" );
		ui.hint.active = false;
		ui.hint.timeout = null;

		ui.hint.display = function( content, duration )
		{
			if( this.timeout !== null )
			{
				clearTimeout( this.timeout );
				this.timeout = null;
			}

			this.text( content ).show();

			if( duration )
			{
				this.timeout = setTimeout( (
					function()
					{
						this.cancel();
					} ).bind( this ),
					duration * 1000 );
			}

			this.active = true;
		}

		ui.hint.cancel = function()
		{
			if( ui.hint.timeout !== null )
			{
				clearTimeout( ui.hint.timeout );
				ui.hint.timeout = null;
			}

			ui.active = false;
			ui.hint.hide();
		}

		ui.hint.elem.onclick = function()
		{
			ui.hint.cancel();
		}
	}
}
