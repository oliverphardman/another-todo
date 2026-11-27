# Theme photos

The photos included in the theme menu are in `apps/client/assets/themes`. Each one is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) according to its Wikimedia Commons page, so it can be used and redistributed without payment or attribution. The authors are credited here anyway. Licenses were checked on 2026-11-27.

| File           | Author         | Source                                                                                     | License |
| -------------- | -------------- | ------------------------------------------------------------------------------------------ | ------- |
| aurora.jpg     | Johannes Groll | https://commons.wikimedia.org/wiki/File:Lofoten,_Norway_(Unsplash).jpg                     | CC0 1.0 |
| mountain.jpg   | Ales Krivec    | https://commons.wikimedia.org/wiki/File:Clouds_mirrored_in_a_mountain_lake_(Unsplash).jpg  | CC0 1.0 |
| forest.jpg     | Seaq68         | https://commons.wikimedia.org/wiki/File:Forest_Away_Path.jpg                               | CC0 1.0 |
| coast.jpg      | Jebulon        | https://commons.wikimedia.org/wiki/File:Komos_site_baie_Cr%C3%A8te.jpg                     | CC0 1.0 |
| desert.jpg     | Bernard Gagnon | https://commons.wikimedia.org/wiki/File:Khongoryn_Els_04.jpg                               | CC0 1.0 |
| wave.jpg       | Austin Schmid  | https://commons.wikimedia.org/wiki/File:Big_ocean_surf_wave_(Unsplash).jpg                 | CC0 1.0 |
| fern.jpg       | W.carter       | https://commons.wikimedia.org/wiki/File:Lady_fern_at_Myrstigen_trail_1.jpg                 | CC0 1.0 |
| bridge.jpg     | sbmeaper1      | https://commons.wikimedia.org/wiki/File:360_Bridge_Sunset,_Austin_TX.jpg                   | CC0 1.0 |
| lighthouse.jpg | Bernard Spragg | https://commons.wikimedia.org/wiki/File:Wollongong_Breakwater_Lighthouse_(21351551761).jpg | CC0 1.0 |
| lotus.jpg      | Hong Zhang     | https://commons.wikimedia.org/wiki/File:Lotus_flower_(978659).jpg                          | CC0 1.0 |

## Adding a photo

1. Use only photos that are CC0 or otherwise in the public domain, and record the source here.
2. Save a JPEG 1920 pixels wide as `<id>.jpg` and one 216 pixels wide as `<id>-thumbnail.jpg`, for example with `sips --resampleWidth 1920 -s format jpeg -s formatOptions 45 original.jpg --out <id>.jpg`.
3. Add the entry to `apps/client/src/photos/preset-photos.ts` and its `preset.<id>` name to every locale.

The server stores only the id, so adding a photo needs no server change. An app that does not have a chosen photo shows the view's default color. Never rename or remove an id that has shipped.
