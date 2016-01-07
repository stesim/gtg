function GameState( name, onenter, onleave )
{
	this.name = name;

	this._enter = onenter;
	this._leave = onleave;
}

GameState._current = null;

GameState.get = function()
{
	return GameState._current;
}

GameState.set = function( state )
{
	if( GameState._current !== null )
	{
		GameState._current._leave( state );
	}

	var prevState = GameState._current;
	GameState._current = state;

	if( GameState._current !== null )
	{
		GameState._current._enter( prevState );
	}
}

var GameStates =
{
	Menu: new GameState(
		"Menu",
		function()
		{
			if( !GameStates.Menu.lastVisible )
			{
				GameStates.Menu.lastVisible = ui.mainMenu;
			}

			graphics.disableRendering();

			ui.storyMenu.visible( GameStates.Menu.lastVisible === ui.storyMenu );
			ui.levelsMenu.visible( GameStates.Menu.lastVisible === ui.levelsMenu );
			ui.mainMenu.visible( GameStates.Menu.lastVisible === ui.mainMenu );

			ui.titleText.show();
		},
		function()
		{
			ui.titleText.hide();
			ui.mainMenu.hide();
			ui.storyMenu.hide();
			ui.levelsMenu.hide();

			graphics.enableRendering();
		} ),

	LevelEditing: new GameState(
		"LevelEditing",
		function()
		{
			GameStates.LevelEditing.finished = false;

			ui.levelCreationMenu.exportLink.hide();
			ui.levelCreationMenu.undoButton.show();
			ui.levelCreationMenu.finishButton.show();
			ui.levelCreationMenu.filePicker.elem.value = null;
			ui.levelCreationMenu.show();
		},
		function( newState )
		{
			GameStates.LevelEditing.finished = true;

			ui.levelCreationMenu.hide();

			restart();
		} ),

	LevelLoading: new GameState(
		"LevelLoading",
		function()
		{
		},
		function()
		{
		} ),

	GuardPlacement: new GameState(
		"GuardPlacement",
		function()
		{
			ui.ingameMenu.show();
			//ui.ingameMenu.undoButton.show();
		},
		function( newState )
		{
			//ui.ingameMenu.undoButton.hide();

			if( isInFirstPerson )
			{
				switchToOverview();
			}

			if( newState !== GameStates.LevelCompleted )
			{
				ui.ingameMenu.hide();
				restart();
			}
		} ),

	LevelCompleted: new GameState(
		"LevelCompleted",
		function()
		{
			ui.completionText.show();
			if( currentLevel < levels.length - 1 )
			{
				ui.ingameMenu.nextButton.show();
			}
		},
		function()
		{
			ui.completionText.hide();
			ui.ingameMenu.nextButton.hide();
			ui.ingameMenu.hide();

			restart();
		} ),
}
