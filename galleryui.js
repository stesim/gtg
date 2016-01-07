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

		ui.levelCreationMenu = new UI.Group()
			.position( { top: 15, left: 15 } ).cssClass( "horizontalMenu" );

		ui.levelCreationMenu.cancelButton = new UI.Button( "BACK",
			function()
			{
				GameState.set( GameStates.Menu );
			}, ui.levelCreationMenu ).position( { top: 0, left: 0 } ).show();

		ui.levelCreationMenu.finishButton = new UI.Button( "Finish",
			function()
			{
				if( polygon.length > 2 )
				{
					finishLevelEditing();
					processLevel();
				}
			}, ui.levelCreationMenu ).position( { top: 40, left: 135 } ).show();

		ui.levelCreationMenu.newButton = new UI.Button( "New",
			function()
			{
				GameState.set( GameStates.LevelEditing );
			}, ui.levelCreationMenu ).position( { top: 0, left: 135 } ).show();

		ui.levelCreationMenu.undoButton = new UI.Button( "Undo",
			function()
			{
				undoWall();
			}, ui.levelCreationMenu ).position( { top: 40, left: 0 } ).show();

		ui.levelCreationMenu.add( new UI.Text( "Import SVG:" )
			.size( 150, 20 ).position( { top: 10, left: 300 } ).show() );
		ui.levelCreationMenu.filePicker =
			new UI.FilePicker( ".svg", onSvgSelected, ui.levelCreationMenu )
				.position( { top: 35, left: 300 } ).show();

		ui.levelCreationMenu.exportLink =
			new UI.Link( "[JS Level File]", null, ui.levelCreationMenu )
				.size( 130, 20 ).position( { top: 40, left: 0 } );

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
				loadLevel( ++currentLevel );
			}, ui.ingameMenu ).position( { top: 0, left: 135 } );

//		ui.ingameMenu.undoButton = new UI.Button( "Undo",
//			function()
//			{
//				undoGuard();
//			}, ui.ingameMenu ).position( { top: 0, left: 135 } ).show();

		ui.ingameMenu.overviewButton = new UI.Button( "Overview",
			function()
			{
				switchToOverview();
			}, ui.ingameMenu ).position( { top: 0, left: 135 } );

		ui.completionText = new UI.Text( "Level completed!" )
			.position( { top: 100, left: 100 } ).cssClass( "title" );
	}
}
