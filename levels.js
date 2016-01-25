var levels = new Array();

function Level( name, description, budget, requiredBudget, guardTypes,
                geometry, holes, pictures, version )
{
	this.name = name;
	this.description = description;
	this.budget = budget;
	this.requiredBudget = requiredBudget;
	this.guardTypes = guardTypes;
	this.geometry = geometry;
	this.holes = holes;
	this.pictures = pictures;
	this.version = version;
}

//Level.loadLevelFile = function( section, level )
//{
//	var elem = document.createElement( "script" );
//	elem.setAttribute( "type", "text/javascript" );
//	elem.src = "levels/03_Level" + level + ".js";
//	document.head.appendChild( elem );
//}
//
//Level.loadLevelFiles = function()
//{
//	for( var i = 1; i <= 15; ++i )
//	{
//		Level.loadLevelFile( 1, i );
//	}
//}
//
//Level.loadLevelFiles();
