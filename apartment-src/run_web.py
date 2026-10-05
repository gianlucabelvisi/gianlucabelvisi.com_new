import sys, runpy
sys.argv = ['blender','--','geom.json','web','1','10','none']
runpy.run_path('build.py', run_name='__main__')
sys.argv = ['x','--','web/apartment.blend','web/apartment.glb']
runpy.run_path('export_web.py', run_name='__main__')
