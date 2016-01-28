var ui =
{
	init: function()
	{
		ui.titleText = new UI.Text( "GUARD THE GALLERY" )
			.position( { top: 100, left: 100 } ).cssClass( "title" );

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

		ui.mainMenu.add( new UI.Button( "About",
			function()
			{
				GameState.set( GameStates.About );
			} ).position( { top: 80, left: 0 } ).show() );

		ui.mainMenu.add( new UI.Button( "Developer",
			function()
			{
				ui.mainMenu.hide();
				ui.developerMenu.show();

				GameStates.Menu.lastVisible = ui.developerMenu;
			} ).position( { top: 160, left: 0 } ).show() );

		ui.developerMenu = new UI.Group()
			.position( { top: 200, left: 100 } )
			.size( 125, 200 )
			.cssClass( "verticalMenu" );

		ui.developerMenu.add( new UI.Button( "Level Editor",
			function()
			{
				GameState.set( GameStates.LevelEditing );
			} ).position( { top: 0, left: 0 } ).show() );

		ui.developerMenu.add( new UI.Text( "Load local level:" )
			.position( { top: 60, left: 0 } ).show() );

		ui.developerMenu.levelPicker = new UI.FilePicker( ".js",
			function( event )
			{
				var reader = new FileReader();
				reader.onload = function()
				{
					var elem = document.createElement( "script" );
					elem.setAttribute( "type", "text/javascript" );
					elem.innerHTML = reader.result;
					document.head.appendChild( elem );

					var level = levels.pop();
					loadLevel( level );
				}
				reader.readAsText( event.target.files[ 0 ] );
			}, ui.developerMenu ).position( { top: 85, left: 0 } ).show();

		ui.developerMenu.add( new UI.Button( "BACK",
			function()
			{
				ui.developerMenu.hide();
				ui.mainMenu.show();

				GameStates.Menu.lastVisible = ui.mainMenu;
			} ).position( { top: 180, left: 0 } ).show() );

		ui.storyMenu = new UI.Group()
			.position( { top: 200, left: 100 } )
			.size( 125, 200 )
			.cssClass( "verticalMenu" );

		ui.storyMenu.add( new UI.Button( "Continue",
			function()
			{
				var progress = Cookie.get( "progress" );
				loadLevel( levels[ isNaN( progress ) ? 0 : progress ] );
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

		ui.levelsMenu.add( new UI.Text( "Museum 1" )
			.position( { top: 0, left: 0 } )
			.size( 125, 0 )
			.cssClass( "centered" ).show() );

		ui.levelsMenu.add( new UI.Text( "Museum 2" )
			.position( { top: 0, left: 525 } )
			.size( 125, 0 )
			.cssClass( "centered" ).show() );

		ui.levelsMenu.add( new UI.Text( "Museum 3" )
			.position( { top: 0, left: 700 } )
			.size( 125, 0 )
			.cssClass( "centered" ).show() );

		var levelOnclick = function( i ) { loadLevel( levels[ i ] ); };
		var progress = Cookie.getInt( "progress" );
		if( isNaN( progress ) )
		{
			progress = 0;
		}
		ui.levelsMenu.buttons = new Array( levels.length );
		for( var i = 0; i < levels.length; ++i )
		{
			ui.levelsMenu.buttons[ i ] = new UI.Button( levels[ i ].name,
				levelOnclick.bind( this, i ), ui.levelsMenu )
					.position( {
						top: 40 + 40 * ( i % 5 ),
						left: 175 * Math.floor( i / 5 ) } )
					.show();
			if( i > progress )
			{
				ui.levelsMenu.buttons[ i ].disable();
			}
		}
		ui.levelsMenu.add( new UI.Button( "BACK",
			function()
			{
				ui.levelsMenu.hide();
				ui.storyMenu.show();

				GameStates.Menu.lastVisible = ui.storyMenu;
			} ).position( { top: 40 + 6 * 40, left: 0 } ).show() );

		ui.ingameMenu = new UI.Group()
			.position( { top: 15, left: 15 } ).cssClass( "horizontalMenu" );

		ui.ingameMenu.quitButton = new UI.Button( "QUIT",
			function()
			{
				GameState.set( GameStates.Menu );
			}, ui.ingameMenu ).position( { top: 0, left: 0 } ).show();

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
			.size( 1, 0, true ).cssClass( "justified" ).show();

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
