//INSTRUCTIONS//

/Block 2 Checkpoint/
For the Block 2 Checkpoint, the lab07_engine folder must be downloaded and readable in order for the notebook to run correctly,
as it depends on the engine.py and world_animation.py files. Additionally, Checkpoint 2 will write two mp4 files, one for each
simulation. For the Spring_Box simulation, the conservation panel is included in the relevant mp4 file.

/Engine/
The engine is lacking in detailed annotations, as I neglected to write them, so I will give a brief overview of how to run it
here. All simulations are carried out via the World class's .run() method. The default for this method is to stop after 10 time
units have elapsed, if you want a different end condition, pass a boolean function in the method as end_condition = function. The
simulation will then halt once that function returns true. The end_t variable can also be set to alter the end time. When simula-
ting worlds with many bodies and collisions, it may be preferable to use spatial gridding to reduce the run time. Spatial griddi-
ng is set to false by default, but passing a tuple for x_ext and/or y_ext will set it to be active. The number of cells per side
is then controlled by the grid_n variable.

/World_Animation/
This file is a short and unpolished script that contains only one funtion, world_animation(). Pass a world object into this func-
tion to write an mp4 file animating the world. Most of parameters of this function are self explanatory, however, if you want the
mp4 file to display dynamic text, (energy, momentum, ect.), you must pass a dictionary into the show argument with each key-value
pair in the dictionary being the name of the value you want to display, and a function which will yield that value.