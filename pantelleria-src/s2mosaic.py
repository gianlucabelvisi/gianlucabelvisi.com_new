from PIL import Image
import os
z=15; X0,X1,Y0,Y1=17467,17483,12770,12787
W=(X1-X0+1)*256; H=(Y1-Y0+1)*256
m=Image.new('RGB',(W,H))
for x in range(X0,X1+1):
    for y in range(Y0,Y1+1):
        f=f'data/s2/{z}_{x}_{y}.jpg'
        try: m.paste(Image.open(f).convert('RGB'),((x-X0)*256,(y-Y0)*256))
        except Exception as e: print('bad',f,e)
m.save('data/s2_mosaic.png'); print(m.size)
m.resize((W//4,H//4)).save('s2_small.jpg')
