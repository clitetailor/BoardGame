import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'roomsFilter'
})
export class RoomsFilterPipe implements PipeTransform {

  transform(rooms: any[], search: string): any[] {
    if (search === null || search === undefined || search.match(/^s*$/)) {
      return rooms;
    }

    return rooms.filter(room => room.title.indexOf(search) !== -1)
  }

}
