export type VideoItem = {
  title: string;
  description: string;
  url: string;
  source: string;
  thumbnail?: string;
};

/*
  Add your homepage videos here.

  Supported links:
  - YouTube watch links: https://www.youtube.com/watch?v=VIDEO_ID
  - YouTube short links: https://youtu.be/VIDEO_ID
  - Vimeo links: https://vimeo.com/VIDEO_ID
  - X/Twitter status links: https://twitter.com/i/status/POST_ID
  - Direct video files: /videos/my-video.mp4 or https://example.com/video.mp4
*/
export const homeVideos: VideoItem[] = [
  {
    title: 'FIFA spotlights Argentina Goat | Lionel Messi | Superstars To Watch in FIFA WORLD CUP 2026',
    description: 'A GoalSphere superstar watch feature on Lionel Messi and Argentina ahead of FIFA World Cup 2026.',
    url: 'https://www.youtube.com/embed/xaKZe17XBsY?si=2PqtvOfO-oeNn4EJ',
    source: 'YouTube',
    thumbnail: 'https://img.youtube.com/vi/xaKZe17XBsY/hqdefault.jpg',
  },
  {
    title: 'Superstars To Watch in FIFA WORLD CUP 2026: Erling Haaland',
    description: 'A GoalSphere player feature on Erling Haaland, one of the superstars to watch on the road to FIFA World Cup 2026.',
    url: 'https://www.youtube.com/embed/RtL-tjXQGcY?si=tOp3HjE90h2UmnNU',
    source: 'YouTube',
    thumbnail: 'https://img.youtube.com/vi/RtL-tjXQGcY/hqdefault.jpg',
  },
  {
    title: 'FIFA World Cup - History & Heritage',
    description: 'Experience the history, passion, and legacy of the FIFA World Cup. From legendary moments and iconic champions to unforgettable goals and global celebrations, the World Cup has united football fans across generations: World Cup history, legendary champions, global football heritage, and football legacy.',
    url: 'https://www.youtube.com/embed/THlVl8AeLuI?si=hPwZjOQ_Exg916LU',
    source: 'YouTube',
    thumbnail: 'https://img.youtube.com/vi/THlVl8AeLuI/hqdefault.jpg',
  },
  {
    title: 'GoalSphere World Cup 2026 Feature',
    description: 'Watch the latest GoalSphere World Cup 2026 video from our official YouTube channel.',
    url: 'https://www.youtube.com/embed/oDUFmoWHUco?si=3f7BSZMnHw6N4x0y',
    source: 'YouTube',
    thumbnail: 'https://img.youtube.com/vi/oDUFmoWHUco/hqdefault.jpg',
  },
];

export const highlightVideos: VideoItem[] = [
  {
    title: 'South Korea 1-1 Czech Republic: Oh Hyeon-Gyu Equalizes',
    description: 'Oh Hyeon-Gyu scores with a left-footed shot from the center of the box after an assist from Hwang In-Beom.',
    url: '/videos/south-korea-czech-republic-oh-hyeon-gyu-goal.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/south-korea-czech-republic-oh-hyeon-gyu-goal.jpg',
  },
  {
    title: 'Mexico 1-0 South Africa: Hirving Lozano Scores World Cup Opener',
    description: 'Hirving Lozano gives Mexico the lead against South Africa in the FIFA World Cup 2026 opening match.',
    url: '/videos/mexico-south-africa-lozano-goal.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/mexico-south-africa-lozano-goal.jpg',
  },
  {
    title: 'Mexico 2-0 South Africa: Santiago Gimenez Seals Opening Win',
    description: 'Santiago Gimenez scores Mexico\'s second goal to seal a dream World Cup 2026 opening-night victory.',
    url: '/videos/mexico-south-africa-gimenez-goal.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/mexico-south-africa-gimenez-goal.jpg',
  },
  {
    title: 'Messi Enters and Argentina Make It 3-0',
    description: 'Argentina turn up the energy after Lionel Messi enters, adding another goal in a 3-0 highlight.',
    url: '/videos/messi-argentina-3-0-highlight.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/messi-argentina-3-0-highlight.jpg',
  },
  {
    title: 'Michael Olise vs Northern Ireland: Hat-Trick and POTM Night',
    description: 'Michael Olise delivers a hat-trick and player-of-the-match performance against Northern Ireland.',
    url: '/videos/michael-olise-northern-ireland-hat-trick-potm.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/michael-olise-northern-ireland-hat-trick-potm.jpg',
  },
  {
    title: 'Spain vs Peru Highlights: Pedri Gonzalez Shows World Cup Quality',
    description: 'Pedri Gonzalez delivers a standout Spain vs Peru highlight as the World Cup awaits.',
    url: '/videos/spain-peru-pedri-highlight.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/spain-peru-pedri-highlight.jpg',
  },
  {
    title: "Brazil 2-1 Egypt: Endrick Takes the Lead from Raphinha's Assist",
    description: "Endrick puts Brazil ahead after Raphinha's assist in the Brazil vs Egypt friendly.",
    url: '/videos/brazil-egypt-endrick-raphinha-assist.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/brazil-egypt-endrick-raphinha-assist.jpg',
  },
  {
    title: 'Brazil 1-1 Egypt: Mostafa Ziko Equalizes for Egypt',
    description: 'Mostafa Ziko brings Egypt level against Brazil with a key equalizer.',
    url: '/videos/brazil-egypt-mostafa-ziko-equalizer.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/brazil-egypt-mostafa-ziko-equalizer.jpg',
  },
  {
    title: 'Brazil 1-0 Egypt: Bruno Guimaraes Opens the Scoring',
    description: 'Bruno Guimaraes scores the opener for Brazil against Egypt.',
    url: '/videos/brazil-egypt-bruno-guimaraes-opener.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/brazil-egypt-bruno-guimaraes-opener.jpg',
  },
  {
    title: 'Mexico 1-1 Serbia: Late Drama in World Cup Warm-Up',
    description: 'Mexico and Serbia play out a 1-1 draw in a dramatic World Cup warm-up highlight.',
    url: '/videos/mexico-serbia-1-1-highlight.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/mexico-serbia-1-1-highlight.jpg',
  },
  {
    title: "France 1-2 Cote d'Ivoire: Amad Scores Against France",
    description: "France are beaten 2-1 at home by Cote d'Ivoire in a World Cup warm-up match.",
    url: '/videos/france-cote-divoire-amad-goal.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/france-cote-divoire-amad-goal.jpg',
  },
  {
    title: 'Spain 1-1 Iraq: Merchas Doski Scores Beautiful Equalizer',
    description: 'Spain are held to a 1-1 draw by Iraq in the final home warm-up game before the World Cup.',
    url: '/videos/spain-iraq-merchas-doski-goal.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/spain-iraq-merchas-doski-goal.jpg',
  },
  {
    title: 'Spain 1-1 Iraq: Ferran Produces an Insane Solo Run',
    description: 'Spain are held to a 1-1 draw by Iraq in the final home warm-up game before the World Cup.',
    url: '/videos/spain-iraq-ferran-solo-run.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/spain-iraq-ferran-solo-run.jpg',
  },
  {
    title: 'Sweden 2-1 Greece: Gustaf Nilsson Makes It Two After Taha Ali Dribble',
    description: '',
    url: '/videos/sweden-greece-gustaf-nilsson-taha-ali.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/sweden-greece-gustaf-nilsson-taha-ali.jpg',
  },
  {
    title: 'Sweden 2-1 Greece: Kostas Tsimikas Goal',
    description: '',
    url: '/videos/sweden-greece-kostas-tsimikas-goal.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/sweden-greece-kostas-tsimikas-goal.jpg',
  },
  {
    title: 'Algeria Beat the Netherlands 1-0 in Friendly Before World Cup Kickoff',
    description: '',
    url: '/videos/algeria-netherlands-friendly.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/algeria-netherlands-friendly.jpg',
  },
  {
    title: 'Friendly Match: Luxembourg 0-1 Italy',
    description: '',
    url: '/videos/luxembourg-italy-friendly.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/luxembourg-italy-friendly.jpg',
  },
  {
    title: 'Duke Lacroix Makes It Four for Haiti! This Team Is Fantastic!',
    description: '',
    url: '/videos/haiti-duke-lacroix-goal.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/haiti-duke-lacroix-goal.jpg',
  },
  {
    title: 'Goal: Frantzdy Pierrot Makes It Three for Haiti! What a Sensational Team Goal!',
    description: '',
    url: '/videos/haiti-frantzdy-pierrot-goal.mp4',
    source: 'GoalSphere Video',
    thumbnail: '/videos/haiti-frantzdy-pierrot-goal.jpg',
  },
];
